package com.aniway.post.controller;

import com.aniway.post.dto.PostDtos;
import com.aniway.post.service.PostService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final PostService postService;
    private final WebClient imageStorageWebClient;

    public PostController(PostService postService, WebClient imageStorageWebClient) {
        this.postService = postService;
        this.imageStorageWebClient = imageStorageWebClient;
    }

    private Long currentUserId(String header) {
        if (header == null || header.isBlank()) return null;
        try { return Long.parseLong(header); } catch (NumberFormatException e) { return null; }
    }

    @PostMapping
    public PostDtos.PostResponse create(@RequestHeader("X-User-Id") String userHeader,
                                        @Valid @RequestBody PostDtos.CreatePostRequest req) {
        Long userId = currentUserId(userHeader);
        if (userId == null) throw new IllegalStateException("Unauthenticated");
        return postService.create(userId, req);
    }

    @PutMapping("/{id}")
    public PostDtos.PostResponse update(@RequestHeader("X-User-Id") String userHeader,
                                        @PathVariable Long id,
                                        @Valid @RequestBody PostDtos.UpdatePostRequest req) {
        Long userId = currentUserId(userHeader);
        if (userId == null) throw new IllegalStateException("Unauthenticated");
        return postService.update(id, userId, req);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@RequestHeader("X-User-Id") String userHeader,
                                    @PathVariable Long id) {
        Long userId = currentUserId(userHeader);
        if (userId == null) throw new IllegalStateException("Unauthenticated");
        postService.delete(id, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    public PostDtos.PostResponse get(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                     @PathVariable Long id) {
        return postService.get(id, currentUserId(userHeader));
    }

    @GetMapping
    public Page<PostDtos.PostResponse> list(@RequestHeader(value = "X-User-Id", required = false) String userHeader,
                                            @RequestParam Long userId,
                                            @RequestParam(defaultValue = "0") int page,
                                            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return postService.listByAuthor(userId, pageable, currentUserId(userHeader));
    }

    public record VoteRequest(int value) {}

    @PostMapping("/{id}/vote")
    public PostDtos.PostResponse vote(@RequestHeader("X-User-Id") String userHeader,
                                      @PathVariable Long id,
                                      @RequestBody VoteRequest vote) {
        Long userId = currentUserId(userHeader);
        if (userId == null) throw new IllegalStateException("Unauthenticated");
        return postService.vote(id, userId, vote.value());
    }

    @PostMapping(value = "/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public List<Map<String, Object>> upload(@RequestHeader("X-User-Id") String userHeader,
                                            @RequestPart("files") List<MultipartFile> files) throws Exception {
        Long userId = currentUserId(userHeader);
        if (userId == null) throw new IllegalStateException("Unauthenticated");
        if (files.size() > 5) throw new IllegalArgumentException("Too many files (max 5)");
        for (MultipartFile f : files) {
            if (f.getSize() > 5 * 1024 * 1024) throw new IllegalArgumentException("File too large (max 5MB): " + f.getOriginalFilename());
            if (f.getContentType() == null || !f.getContentType().startsWith("image/"))
                throw new IllegalArgumentException("Only image files allowed: " + f.getOriginalFilename());
        }

        MultiValueMap<String, Object> form = new LinkedMultiValueMap<>();
        for (MultipartFile file : files) {
            ByteArrayResource resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(file.getContentType() == null ? "application/octet-stream" : file.getContentType()));
            org.springframework.http.HttpEntity<ByteArrayResource> part = new org.springframework.http.HttpEntity<>(resource, headers);
            form.add("files", part);
        }
        form.add("userId", userId.toString());

        return imageStorageWebClient.post()
        .uri("/api/images/posts")
        .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(form))
        .retrieve()
        .bodyToMono(new ParameterizedTypeReference<List<Map<String,Object>>>() {})
        .block();
    }
}
