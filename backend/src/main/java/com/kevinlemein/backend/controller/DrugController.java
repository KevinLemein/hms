package com.kevinlemein.backend.controller;

import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.DrugResponse;
import com.kevinlemein.backend.service.DrugService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/drugs")
@RequiredArgsConstructor
public class DrugController {

    private final DrugService drugService;

    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<DrugResponse>>> getAllDrugs() {
        return ResponseEntity.ok(ApiResponse.success("Drugs retrieved", drugService.getAllDrugs()));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<DrugResponse>> getDrugById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Drug retrieved", drugService.getDrugById(id)));
    }
}