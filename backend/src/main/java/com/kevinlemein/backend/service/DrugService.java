package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.DrugResponse;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.model.Drug;
import com.kevinlemein.backend.repository.DrugRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DrugService {

    private final DrugRepository drugRepository;

    public List<DrugResponse> getAllDrugs() {
        return drugRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public DrugResponse getDrugById(Long id) {
        return mapToResponse(drugRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Drug not found")));
    }

    private DrugResponse mapToResponse(Drug drug) {
        return DrugResponse.builder()
                .id(drug.getId())
                .name(drug.getName())
                .manufacturerId(drug.getManufacturerId())
                .milligrams(drug.getMilligrams())
                .category(drug.getCategory())
                .cost(drug.getCost())
                .quantity(drug.getQuantity())
                .build();
    }
}