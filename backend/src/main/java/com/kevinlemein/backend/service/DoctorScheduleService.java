package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.*;
import com.kevinlemein.backend.exception.DuplicateResourceException;
import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.DoctorSchedule;
import com.kevinlemein.backend.model.DoctorTimeOff;
import com.kevinlemein.backend.model.Role;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.repository.DoctorScheduleRepository;
import com.kevinlemein.backend.repository.DoctorTimeOffRepository;
import com.kevinlemein.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * A doctor's working hours and time off, and the bookable start times they produce.
 *
 * A doctor with no saved schedule blocks uses the clinic-wide default hours
 * (every day, opening-hour to closing-hour), so existing doctors keep working
 * without any set-up. Time off always wins over the schedule.
 */
@Service
@RequiredArgsConstructor
public class DoctorScheduleService {

    private final DoctorScheduleRepository scheduleRepository;
    private final DoctorTimeOffRepository timeOffRepository;
    private final UserRepository userRepository;
    private final Clock clinicClock;

    @Value("${app.clinic.opening-hour:8}")
    private int openingHour;

    @Value("${app.clinic.closing-hour:17}")
    private int closingHour;

    @Value("${app.clinic.slot-minutes:30}")
    private int slotMinutes;

    // ---------- weekly schedule ----------

    @Transactional(readOnly = true)
    public DoctorScheduleResponse getSchedule(Long doctorId) {
        requireDoctor(doctorId);
        List<DoctorSchedule> saved = scheduleRepository.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctorId);
        if (saved.isEmpty()) {
            List<ScheduleBlockResponse> defaults = new ArrayList<>();
            for (int day = 1; day <= 7; day++) {
                defaults.add(toResponse(day, LocalTime.of(openingHour, 0), LocalTime.of(closingHour, 0), slotMinutes));
            }
            return DoctorScheduleResponse.builder().custom(false).blocks(defaults).build();
        }
        return DoctorScheduleResponse.builder().custom(true)
                .blocks(saved.stream()
                        .map(s -> toResponse(s.getDayOfWeek(), s.getStartTime(), s.getEndTime(), s.getSlotMinutes()))
                        .collect(Collectors.toList()))
                .build();
    }

    /** Replaces the doctor's whole weekly schedule. An empty list goes back to the clinic default hours. */
    @Transactional
    public DoctorScheduleResponse replaceSchedule(Long doctorId, UpdateScheduleRequest request) {
        User doctor = requireDoctor(doctorId);

        List<DoctorSchedule> blocks = new ArrayList<>();
        for (ScheduleBlockRequest b : request.getBlocks()) {
            LocalTime start = parseTime(b.getStartTime());
            LocalTime end = parseTime(b.getEndTime());
            if (!start.isBefore(end)) {
                throw new InvalidRequestException("A schedule block must end after it starts");
            }
            if (Duration.between(start, end).toMinutes() < b.getSlotMinutes()) {
                throw new InvalidRequestException("A schedule block must be at least one slot long");
            }
            blocks.add(DoctorSchedule.builder().doctor(doctor).dayOfWeek(b.getDayOfWeek())
                    .startTime(start).endTime(end).slotMinutes(b.getSlotMinutes()).build());
        }

        blocks.sort(Comparator.comparingInt(DoctorSchedule::getDayOfWeek).thenComparing(DoctorSchedule::getStartTime));
        for (int i = 1; i < blocks.size(); i++) {
            DoctorSchedule prev = blocks.get(i - 1);
            DoctorSchedule cur = blocks.get(i);
            if (prev.getDayOfWeek() == cur.getDayOfWeek() && cur.getStartTime().isBefore(prev.getEndTime())) {
                throw new InvalidRequestException("Schedule blocks on the same day must not overlap");
            }
        }

        scheduleRepository.deleteAllForDoctor(doctorId);
        scheduleRepository.flush();
        scheduleRepository.saveAll(blocks);
        return getSchedule(doctorId);
    }

    // ---------- time off ----------

    @Transactional(readOnly = true)
    public List<TimeOffResponse> getUpcomingTimeOff(Long doctorId) {
        requireDoctor(doctorId);
        return timeOffRepository
                .findByDoctorIdAndEndDateGreaterThanEqualOrderByStartDateAsc(doctorId, LocalDate.now(clinicClock)).stream()
                .map(t -> TimeOffResponse.builder().id(t.getId())
                        .startDate(t.getStartDate().toString()).endDate(t.getEndDate().toString())
                        .reason(t.getReason()).build())
                .collect(Collectors.toList());
    }

    @Transactional
    public TimeOffResponse addTimeOff(Long doctorId, TimeOffRequest request) {
        User doctor = requireDoctor(doctorId);
        LocalDate start = parseDate(request.getStartDate());
        LocalDate end = parseDate(request.getEndDate());
        if (end.isBefore(start)) {
            throw new InvalidRequestException("End date must not be before the start date");
        }
        if (end.isBefore(LocalDate.now(clinicClock))) {
            throw new InvalidRequestException("Time off cannot be entirely in the past");
        }
        DoctorTimeOff saved = timeOffRepository.save(DoctorTimeOff.builder()
                .doctor(doctor).startDate(start).endDate(end)
                .reason(request.getReason() == null || request.getReason().isBlank() ? null : request.getReason().trim())
                .build());
        return TimeOffResponse.builder().id(saved.getId())
                .startDate(saved.getStartDate().toString()).endDate(saved.getEndDate().toString())
                .reason(saved.getReason()).build();
    }

    @Transactional
    public void deleteTimeOff(Long doctorId, Long timeOffId) {
        DoctorTimeOff timeOff = timeOffRepository.findById(timeOffId)
                .filter(t -> t.getDoctor().getId().equals(doctorId))
                .orElseThrow(() -> new ResourceNotFoundException("Time off not found"));
        timeOffRepository.delete(timeOff);
    }

    // ---------- slots ----------

    /** Every bookable start time for the doctor on a day, ignoring existing appointments. */
    @Transactional(readOnly = true)
    public List<LocalDateTime> slotGrid(Long doctorId, LocalDate date) {
        if (onTimeOff(doctorId, date)) {
            return List.of();
        }
        List<DoctorSchedule> day = scheduleRepository.findByDoctorIdAndDayOfWeekOrderByStartTimeAsc(
                doctorId, date.getDayOfWeek().getValue());
        List<LocalDateTime> slots = new ArrayList<>();
        if (day.isEmpty()) {
            if (!scheduleRepository.existsByDoctorId(doctorId)) {
                addSlots(slots, date, LocalTime.of(openingHour, 0), LocalTime.of(closingHour, 0), slotMinutes);
            }
            return slots;
        }
        for (DoctorSchedule block : day) {
            addSlots(slots, date, block.getStartTime(), block.getEndTime(), block.getSlotMinutes());
        }
        return slots;
    }

    /**
     * Rejects times the doctor has taken off. For a doctor with a saved schedule the time must also
     * be one of their slots; doctors without one can still be booked at any time, as before.
     */
    @Transactional(readOnly = true)
    public void requireBookable(Long doctorId, LocalDateTime dateTime) {
        LocalDate date = dateTime.toLocalDate();
        if (onTimeOff(doctorId, date)) {
            throw new DuplicateResourceException(ErrorCodes.SLOT_UNAVAILABLE, "The doctor is not available on this date");
        }
        if (scheduleRepository.existsByDoctorId(doctorId) && !slotGrid(doctorId, date).contains(dateTime)) {
            throw new DuplicateResourceException(ErrorCodes.SLOT_UNAVAILABLE, "That time is outside the doctor's working hours");
        }
    }

    private boolean onTimeOff(Long doctorId, LocalDate date) {
        return timeOffRepository.existsByDoctorIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(doctorId, date, date);
    }

    private static void addSlots(List<LocalDateTime> out, LocalDate date, LocalTime start, LocalTime end, int minutes) {
        LocalDateTime endAt = date.atTime(end);
        for (LocalDateTime slot = date.atTime(start); !slot.plusMinutes(minutes).isAfter(endAt); slot = slot.plusMinutes(minutes)) {
            out.add(slot);
        }
    }

    private User requireDoctor(Long doctorId) {
        User user = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found"));
        if (user.getRole() != Role.ROLE_DOCTOR) {
            throw new InvalidRequestException("Selected user is not a doctor");
        }
        return user;
    }

    private static LocalTime parseTime(String value) {
        try {
            return LocalTime.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("Times must be in the format HH:mm");
        }
    }

    private static LocalDate parseDate(String value) {
        try {
            return LocalDate.parse(value.trim());
        } catch (DateTimeParseException e) {
            throw new InvalidRequestException("Dates must be in the format yyyy-MM-dd");
        }
    }

    private static ScheduleBlockResponse toResponse(int day, LocalTime start, LocalTime end, int minutes) {
        return ScheduleBlockResponse.builder().dayOfWeek(day)
                .startTime(start.toString()).endTime(end.toString()).slotMinutes(minutes).build();
    }
}
