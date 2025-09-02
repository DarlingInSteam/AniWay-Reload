package shadowshift.studio.authservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import shadowshift.studio.authservice.dto.UserDTO;
import shadowshift.studio.authservice.entity.User;
import shadowshift.studio.authservice.repository.ReadingProgressRepository;
import shadowshift.studio.authservice.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserService implements UserDetailsService {
    
    private final UserRepository userRepository;
    private final ReadingProgressRepository readingProgressRepository;
    
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsernameOrEmail(username, username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }
    
    public UserDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return convertToDTO(user);
    }
    
    public UserDTO getUserByUsername(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        return convertToDTO(user);
    }
    
    public List<UserDTO> searchUsers(String query) {
        List<User> users = userRepository.searchUsers(query);
        return users.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public List<UserDTO> getTopReaders() {
        List<User> topReaders = userRepository.findTopReaders();
        return topReaders.stream()
                .limit(10)
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    public UserDTO updateUserProfile(String username, UserDTO updateRequest) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (updateRequest.getDisplayName() != null) {
            user.setDisplayName(updateRequest.getDisplayName());
        }
        
        if (updateRequest.getBio() != null) {
            user.setBio(updateRequest.getBio());
        }
        
        if (updateRequest.getAvatar() != null) {
            user.setAvatar(updateRequest.getAvatar());
        }
        
        userRepository.save(user);
        log.info("User profile updated: {}", username);
        
        return convertToDTO(user);
    }
    
    public void updateReadingStats(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        Long currentCompletedChapters = readingProgressRepository.countCompletedChaptersByUser(user.getId());
        
        // Only increase the counter, never decrease it to preserve user achievements
        // even if manga/chapters are deleted for legal reasons
        if (currentCompletedChapters.intValue() > user.getChaptersReadCount()) {
            user.setChaptersReadCount(currentCompletedChapters.intValue());
            userRepository.save(user);
        }
    }
    
    public void incrementChapterCount(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        user.setChaptersReadCount(user.getChaptersReadCount() + 1);
        userRepository.save(user);
    }
    
    public UserDTO convertToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .displayName(user.getDisplayName())
                .avatar(user.getAvatar())
                .bio(user.getBio())
                .role(user.getRole())
                .isEnabled(user.getIsEnabled())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .chaptersReadCount(user.getChaptersReadCount())
                .likesGivenCount(user.getLikesGivenCount())
                .commentsCount(user.getCommentsCount())
                .build();
    }
}
