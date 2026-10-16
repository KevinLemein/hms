package com.kevinlemein.backend.service;

import com.kevinlemein.backend.dto.AuthResponse;
import com.kevinlemein.backend.dto.ChangePasswordRequest;
import com.kevinlemein.backend.exception.ErrorCodes;
import com.kevinlemein.backend.exception.InvalidRequestException;
import com.kevinlemein.backend.exception.ResourceNotFoundException;
import com.kevinlemein.backend.dto.LoginRequest;
import com.kevinlemein.backend.model.User;
import com.kevinlemein.backend.repository.UserRepository;
import com.kevinlemein.backend.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /**
     * Changes the signed-in user's password after checking the current one.
     * A wrong current password is a 400 (INVALID_CURRENT_PASSWORD), never a
     * 401: clients treat 401 as "session expired" and sign the user out.
     *
     * Limitation: tokens issued before the change stay valid until they
     * expire (there is no token revocation yet).
     */
    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new InvalidRequestException(ErrorCodes.INVALID_CURRENT_PASSWORD, "Your current password is incorrect");
        }
        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new InvalidRequestException("The new password must be different from the current one");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));

        UserDetails userDetails = new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword(),
                Collections.singletonList(new SimpleGrantedAuthority(user.getRole().name()))
        );

        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("role", user.getRole().name());
        extraClaims.put("userId", user.getId());

        String token = jwtService.generateToken(extraClaims, userDetails);

        return new AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getFirstName(),
                user.getLastName(),
                jwtService.expiresAt(token)
        );
    }
}