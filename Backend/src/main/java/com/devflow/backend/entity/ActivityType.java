package com.devflow.backend.entity;

public enum ActivityType {
    // Project Activities
    PROJECT_CREATED,
    PROJECT_UPDATED,
    PROJECT_STATUS_CHANGED,
    PROJECT_COMPLETED,
    PROJECT_ARCHIVED,
    PROJECT_RESTORED,
    PROJECT_DELETED,

    // Member Activities
    MEMBER_ADDED,
    MEMBER_REMOVED,
    MEMBER_ROLE_CHANGED,
    MEMBER_INVITED,
    INVITATION_ACCEPTED,
    INVITATION_DECLINED,
    INVITATION_CANCELLED,
    INVITATION_EXPIRED,

    // Task Activities
    TASK_CREATED,
    TASK_UPDATED,
    TASK_STATUS_CHANGED,
    TASK_PRIORITY_CHANGED,
    TASK_ASSIGNED,
    TASK_UNASSIGNED,
    TASK_DUE_DATE_CHANGED,
    TASK_COMPLETED,
    TASK_REOPENED,
    TASK_ARCHIVED,
    TASK_RESTORED,
    TASK_DELETED,
    TASK_PROGRESS_UPDATED,
    TASK_DESCRIPTION_UPDATED,
    TASK_TITLE_UPDATED,
    TASK_TAGS_UPDATED,

    // Task Dependencies
    TASK_DEPENDENCY_ADDED,
    TASK_DEPENDENCY_REMOVED,
    TASK_BLOCKED,
    TASK_UNBLOCKED,

    // Comment Activities
    COMMENT_ADDED,
    COMMENT_UPDATED,
    COMMENT_DELETED,
    COMMENT_MENTIONED,

    // File Activities
    FILE_UPLOADED,
    FILE_DOWNLOADED,
    FILE_DELETED,
    FILE_UPDATED,

    // Milestone Activities
    MILESTONE_REACHED,
    DEADLINE_APPROACHING,
    DEADLINE_MISSED,
    DEADLINE_CHANGED,

    // System Activities
    USER_JOINED_PROJECT,
    USER_LEFT_PROJECT,
    PROJECT_HEALTH_CHANGED,
    BULK_TASK_UPDATE
}