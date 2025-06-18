package com.devflow.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class S3FileStorageService {

    @Value("${aws.s3.bucket-name}")
    private String bucketName;

    @Value("${aws.s3.region}")
    private String region;

    @Value("${aws.access-key-id}")
    private String accessKeyId;

    @Value("${aws.secret-access-key}")
    private String secretAccessKey;

    @Value("${aws.s3.url-expiration-hours:24}")
    private int urlExpirationHours;

    @Value("${app.file.max-size:10485760}") // 10MB default
    private long maxFileSize;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    private static final Map<String, String> ALLOWED_CONTENT_TYPES = new HashMap<>();
    static {
        // Images
        ALLOWED_CONTENT_TYPES.put("image/jpeg", "jpg");
        ALLOWED_CONTENT_TYPES.put("image/png", "png");
        ALLOWED_CONTENT_TYPES.put("image/gif", "gif");
        ALLOWED_CONTENT_TYPES.put("image/webp", "webp");
        ALLOWED_CONTENT_TYPES.put("image/svg+xml", "svg");

        // Documents
        ALLOWED_CONTENT_TYPES.put("application/pdf", "pdf");
        ALLOWED_CONTENT_TYPES.put("application/msword", "doc");
        ALLOWED_CONTENT_TYPES.put("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx");
        ALLOWED_CONTENT_TYPES.put("application/vnd.ms-excel", "xls");
        ALLOWED_CONTENT_TYPES.put("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx");
        ALLOWED_CONTENT_TYPES.put("application/vnd.ms-powerpoint", "ppt");
        ALLOWED_CONTENT_TYPES.put("application/vnd.openxmlformats-officedocument.presentationml.presentation", "pptx");
        ALLOWED_CONTENT_TYPES.put("text/plain", "txt");
        ALLOWED_CONTENT_TYPES.put("text/csv", "csv");

        // Archives
        ALLOWED_CONTENT_TYPES.put("application/zip", "zip");
        ALLOWED_CONTENT_TYPES.put("application/x-rar-compressed", "rar");
        ALLOWED_CONTENT_TYPES.put("application/x-7z-compressed", "7z");

        // Other
        ALLOWED_CONTENT_TYPES.put("application/json", "json");
        ALLOWED_CONTENT_TYPES.put("text/xml", "xml");
        ALLOWED_CONTENT_TYPES.put("application/xml", "xml");
    }

    @PostConstruct
    public void initializeS3Client() {
        try {
            AwsBasicCredentials awsCreds = AwsBasicCredentials.create(accessKeyId, secretAccessKey);

            this.s3Client = S3Client.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(awsCreds))
                    .build();

            this.s3Presigner = S3Presigner.builder()
                    .region(Region.of(region))
                    .credentialsProvider(StaticCredentialsProvider.create(awsCreds))
                    .build();

            log.info("S3 client initialized successfully for bucket: {}", bucketName);
        } catch (Exception e) {
            log.error("Failed to initialize S3 client: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to initialize S3 client", e);
        }
    }

    @PreDestroy
    public void cleanup() {
        if (s3Client != null) {
            s3Client.close();
        }
        if (s3Presigner != null) {
            s3Presigner.close();
        }
    }

    public FileUploadResult uploadFile(MultipartFile file, Long taskId, Long userId) throws IOException {
        validateFile(file);
        String fileKey = generateFileKey(taskId, userId, file.getOriginalFilename());

        try {
            Map<String, String> metadata = new HashMap<>();
            metadata.put("task-id", taskId.toString());
            metadata.put("user-id", userId.toString());
            metadata.put("original-filename", file.getOriginalFilename());
            metadata.put("upload-timestamp", LocalDateTime.now().toString());

            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(fileKey)
                    .contentType(file.getContentType())
                    .contentLength(file.getSize())
                    .metadata(metadata)
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            String presignedUrl = generatePresignedUrl(fileKey);
            LocalDateTime urlExpiresAt = LocalDateTime.now().plusHours(urlExpirationHours);

            log.info("File uploaded successfully to S3: {} (size: {} bytes)", fileKey, file.getSize());

            return FileUploadResult.builder()
                    .s3Key(fileKey)
                    .presignedUrl(presignedUrl)
                    .urlExpiresAt(urlExpiresAt)
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .originalFileName(file.getOriginalFilename())
                    .build();

        } catch (Exception e) {
            log.error("Failed to upload file to S3: {}", e.getMessage(), e);
            throw new RuntimeException("Failed to upload file to S3", e);
        }
    }


    public byte[] getFileData(String s3Key) throws IOException {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            ResponseInputStream<GetObjectResponse> s3Object = s3Client.getObject(getObjectRequest);

            return readAllBytes(s3Object);

        } catch (Exception e) {
            log.error("Failed to get file data from S3: {}", s3Key, e);
            throw new IOException("Failed to retrieve file from S3", e);
        }
    }


    public Map<String, String> getFileMetadata(String s3Key) {
        try {
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            HeadObjectResponse response = s3Client.headObject(headObjectRequest);

            Map<String, String> metadata = new HashMap<>();
            metadata.put("contentType", response.contentType());
            metadata.put("contentLength", String.valueOf(response.contentLength()));
            metadata.put("lastModified", response.lastModified().toString());

            if (response.metadata() != null) {
                metadata.putAll(response.metadata());
            }

            return metadata;

        } catch (Exception e) {
            log.error("Failed to get file metadata from S3: {}", s3Key, e);
            return new HashMap<>();
        }
    }

    public String generatePresignedUrl(String s3Key) {
        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                    .signatureDuration(Duration.ofHours(urlExpirationHours))
                    .getObjectRequest(getObjectRequest)
                    .build();

            return s3Presigner.presignGetObject(presignRequest).url().toString();
        } catch (Exception e) {
            log.error("Failed to generate presigned URL for key: {}", s3Key, e);
            throw new RuntimeException("Failed to generate download URL", e);
        }
    }

    public void deleteFile(String s3Key) {
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.deleteObject(deleteObjectRequest);
            log.info("File deleted from S3: {}", s3Key);
        } catch (Exception e) {
            log.error("Failed to delete file from S3: {}", s3Key, e);
        }
    }

    public boolean fileExists(String s3Key) {
        try {
            HeadObjectRequest headObjectRequest = HeadObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            s3Client.headObject(headObjectRequest);
            return true;
        } catch (NoSuchKeyException e) {
            return false;
        } catch (Exception e) {
            log.error("Error checking if file exists: {}", s3Key, e);
            return false;
        }
    }

    public void refreshUrlIfNeeded(String s3Key, LocalDateTime currentExpiration) {
        if (currentExpiration == null || LocalDateTime.now().plusHours(1).isAfter(currentExpiration)) {
            log.info("Refreshing URL for S3 key: {}", s3Key);
            generatePresignedUrl(s3Key);
        }
    }


    private byte[] readAllBytes(InputStream inputStream) throws IOException {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] data = new byte[1024];
        int nRead;
        while ((nRead = inputStream.read(data, 0, data.length)) != -1) {
            buffer.write(data, 0, nRead);
        }
        return buffer.toByteArray();
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        if (file.getSize() > maxFileSize) {
            throw new IllegalArgumentException(
                    String.format("File size exceeds maximum allowed size of %d bytes", maxFileSize)
            );
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.containsKey(contentType)) {
            throw new IllegalArgumentException(
                    "File type not allowed. Allowed types: " + String.join(", ", ALLOWED_CONTENT_TYPES.values())
            );
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || originalFilename.trim().isEmpty()) {
            throw new IllegalArgumentException("File must have a valid filename");
        }

        String extension = getFileExtension(originalFilename).toLowerCase();
        if (extension.equals("exe") || extension.equals("bat") || extension.equals("cmd") ||
                extension.equals("scr") || extension.equals("com") || extension.equals("vbs") ||
                extension.equals("js") || extension.equals("jar")) {
            throw new IllegalArgumentException("File type not allowed for security reasons");
        }
    }

    private String generateFileKey(Long taskId, Long userId, String originalFilename) {
        String uuid = UUID.randomUUID().toString();
        String extension = getFileExtension(originalFilename);
        String sanitizedFilename = sanitizeFilename(originalFilename);

        return String.format("tasks/%d/attachments/%s_%s_%s%s",
                taskId,
                userId,
                uuid.substring(0, 8),
                sanitizedFilename.replaceAll("\\.[^.]*$", ""),
                extension.isEmpty() ? "" : "." + extension
        );
    }

    private String getFileExtension(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf(".") + 1);
    }

    private String sanitizeFilename(String filename) {
        return filename.replaceAll("[^a-zA-Z0-9._-]", "_")
                .replaceAll("_{2,}", "_")
                .substring(0, Math.min(filename.length(), 100));
    }

    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class FileUploadResult {
        private String s3Key;
        private String presignedUrl;
        private LocalDateTime urlExpiresAt;
        private String contentType;
        private Long fileSize;
        private String originalFileName;
    }
}