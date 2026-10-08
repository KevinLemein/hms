using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Business.Entities;
using MediCare.Data;
using MediCare.ViewModels;
using Microsoft.AspNetCore.Authorization;

namespace MediCare.Controllers
{
    [Route("api/[controller]")]
    [AllowAnonymous]
    [ApiController]
    public class AppointmentsController(ApplicationDbContext context) : ControllerBase
    {
        // GET: api/Appointment
        [HttpGet]
        public async Task<ActionResult> GetAppointment()
        {
            try
            {
                var data=await context.Appointments.Include(i=>i.Doctor.User).Include(i=>i.Patient).Include(i=>i.Status)
                    .Select(i=>new AppointmentsVm
                    {
                        Id = i.Id,
                        DoctorId = i.DoctorId,
                        Doctor = i.Doctor.User.FirstName,
                        PatientId = i.PatientId,
                        Patient = i.Patient.Name,
                        AppointmentDateTime = i.AppointmentDateTime,
                        Status = i.Status,
                    }).ToListAsync();
                return Ok(data);
            }
            catch (Exception ex)
            {
                var response = new ApiStatus
                {
                    Code = 500,
                    Error = ex.Message
                };
                return Ok(response);
            }
            
        }

        // GET: api/Appointment/5
        [HttpGet("{id}")]
        public async Task<ActionResult<AppointmentDetailVm>> GetAppointment(int id)
        {
            var appointment = await context.Appointments .Select(i=>new AppointmentsVm
            {
                Id = i.Id,
                DoctorId = i.DoctorId,
                Doctor = i.Doctor.User.FirstName,
                PatientId = i.PatientId,
                Patient = i.Patient.Name,
                AppointmentDateTime = i.AppointmentDateTime,
                Status = i.Status,
            }).Where(i=>i.Id==id).FirstOrDefaultAsync();

            if (appointment == null)
            {
                return NotFound();
            }

            var response = new AppointmentDetailVm
            {
                Appointment = appointment,
                MedicalRecord = context.MedicalRecords.Where(i=>i.AppointmentId==id).FirstOrDefault(),
                Prescriptions = context.Prescriptions.Where(i=>i.AppointmentId==id).ToList(), 
            };
            return response;
        }

        // PUT: api/Appointment/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutAppointment(int id, Appointment Appointment)
        {
            if (id != Appointment.Id)
            {
                return BadRequest();
            }

            context.Entry(Appointment).State = EntityState.Modified;

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!AppointmentExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Appointment
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Appointment>> PostAppointment(Appointment Appointment)
        {
            context.Appointments.Add(Appointment);
            await context.SaveChangesAsync();

            return CreatedAtAction("GetAppointment", new { id = Appointment.Id }, Appointment);
        }

        // DELETE: api/Appointment/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteAppointment(int id)
        {
            var Appointment = await context.Appointments.FindAsync(id);
            if (Appointment == null)
            {
                return NotFound();
            }

            context.Appointments.Remove(Appointment);
            await context.SaveChangesAsync();

            return NoContent();
        }

        private bool AppointmentExists(int id)
        {
            return context.Appointments.Any(e => e.Id == id);
        }
    }
}
