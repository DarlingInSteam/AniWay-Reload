package com.example.recommendationservice.repository;

import com.example.recommendationservice.entity.UserPreferenceProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPreferenceProfileRepository extends JpaRepository<UserPreferenceProfile, Long> {
    Optional<UserPreferenceProfile> findByUserId(Long userId);
}
