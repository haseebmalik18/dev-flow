package com.devflow.backend.entity;

public enum GitHubLinkType {
    REFERENCE,      // Simple reference (#123)
    CLOSES,         // Closes #123
    FIXES,          // Fixes #123
    RESOLVES        // Resolves #123
}