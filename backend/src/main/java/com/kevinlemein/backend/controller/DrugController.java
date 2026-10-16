package com.kevinlemein.backend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.kevinlemein.backend.dto.ApiResponse;
import com.kevinlemein.backend.dto.DrugResponse;
import com.kevinlemein.backend.service.DrugService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Drugs", description = "Drug catalogue (read-only)")
@RestController
@RequestMapping("/api/drugs")
@RequiredArgsConstructor
public class DrugController {

    private final DrugService drugService;

    @Operation(summary = "Drug catalogue", description = "Doctor, receptionist, admin. Includes stock (`quantity`) and price (`cost`).")
    @GetMapping
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<List<DrugResponse>>> getAllDrugs() {
        return ResponseEntity.ok(ApiResponse.success("Drugs retrieved", drugService.getAllDrugs()));
    }

    @Operation(summary = "One drug", description = "Doctor, receptionist, admin.")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('ROLE_DOCTOR', 'ROLE_RECEPTIONIST', 'ROLE_ADMIN')")
    public ResponseEntity<ApiResponse<DrugResponse>> getDrugById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success("Drug retrieved", drugService.getDrugById(id)));
    }
}