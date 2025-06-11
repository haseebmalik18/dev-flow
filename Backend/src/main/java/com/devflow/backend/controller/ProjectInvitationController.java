package com.devflow.backend.controller;

import com.devflow.backend.dto.common.ApiResponse;
import com.devflow.backend.dto.invitation.InvitationDTOs.*;
import com.devflow.backend.entity.User;
import com.devflow.backend.service.ProjectInvitationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class ProjectInvitationController {

    private final ProjectInvitationService projectInvitationService;


    @PostMapping("/projects/{projectId}/invitations")
    public ResponseEntity<ApiResponse<SendInvitationResponse>> sendInvitations(
            @PathVariable Long projectId,
            @Valid @RequestBody SendInvitationRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        SendInvitationResponse response = projectInvitationService.sendInvitations(projectId, request, user);

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Invitations sent successfully", response));
    }


    @GetMapping("/invitations/pending")
    public ResponseEntity<ApiResponse<List<InvitationResponse>>> getPendingInvitations(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        List<InvitationResponse> invitations = projectInvitationService.getPendingInvitations(user);

        return ResponseEntity.ok(ApiResponse.success("Pending invitations retrieved successfully", invitations));
    }


    @GetMapping("/projects/{projectId}/invitations")
    public ResponseEntity<ApiResponse<Page<InvitationSummary>>> getProjectInvitations(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        Page<InvitationSummary> invitations = projectInvitationService.getProjectInvitations(projectId, user, page, size);

        return ResponseEntity.ok(ApiResponse.success("Project invitations retrieved successfully", invitations));
    }


    @GetMapping("/invitations/{token}")
    public ResponseEntity<ApiResponse<InvitationResponse>> getInvitationByToken(
            @PathVariable String token) {

        InvitationResponse invitation = projectInvitationService.getInvitationByToken(token);

        return ResponseEntity.ok(ApiResponse.success("Invitation retrieved successfully", invitation));
    }


    @PostMapping("/invitations/{token}/respond")
    public ResponseEntity<ApiResponse<InvitationResponse>> respondToInvitation(
            @PathVariable String token,
            @Valid @RequestBody RespondToInvitationRequest request,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        InvitationResponse response = projectInvitationService.respondToInvitation(token, request, user);

        String action = request.getAction().toLowerCase();
        String message = action.equals("accept") ?
                "Invitation accepted successfully" :
                "Invitation declined successfully";

        return ResponseEntity.ok(ApiResponse.success(message, response));
    }


    @DeleteMapping("/invitations/{invitationId}")
    public ResponseEntity<ApiResponse<Object>> cancelInvitation(
            @PathVariable Long invitationId,
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        projectInvitationService.cancelInvitation(invitationId, user);

        return ResponseEntity.ok(ApiResponse.success("Invitation cancelled successfully"));
    }


    @GetMapping("/invitations/stats")
    public ResponseEntity<ApiResponse<InvitationStatsResponse>> getInvitationStats(
            Authentication authentication) {

        User user = (User) authentication.getPrincipal();
        InvitationStatsResponse stats = projectInvitationService.getInvitationStats(user);

        return ResponseEntity.ok(ApiResponse.success("Invitation statistics retrieved successfully", stats));
    }
}