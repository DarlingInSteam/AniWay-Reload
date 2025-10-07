# MangaService Build Fix

## Problem
The MangaService Docker build was failing with 4 Java compilation errors:

### Error 1: Duplicate Method Declaration
```
/app/src/main/java/shadowshift/studio/mangaservice/repository/MangaRepository.java:382: 
error: method existsByMelonSlug(String) is already defined in interface MangaRepository
```

### Errors 2-4: Undefined Variables in Wrong Context
```
/app/src/main/java/shadowshift/studio/mangaservice/service/MangaService.java:567: 
error: cannot find symbol - variable updateDTO

/app/src/main/java/shadowshift/studio/mangaservice/service/MangaService.java:568: 
error: cannot find symbol - variable updateDTO

/app/src/main/java/shadowshift/studio/mangaservice/service/MangaService.java:569: 
error: cannot find symbol - variable existingManga
```

## Root Causes

### 1. Duplicate Method in MangaRepository
The method `existsByMelonSlug(String melonSlug)` was defined twice:
- Line 38: Original declaration
- Line 382: Duplicate declaration (end of interface)

### 2. Misplaced Code in MangaService
Code from the `updateManga` method was incorrectly placed inside the `createManga` method:
```java
// This validation code belongs in updateManga, not createManga
if (StringUtils.hasText(updateDTO.getMelonSlug())) {
    String normalizedSlug = updateDTO.getMelonSlug().trim();
    String currentSlug = existingManga.getMelonSlug();
    // ... validation logic
}
```

The variables `updateDTO` and `existingManga` don't exist in `createManga` method context.

## Solution

### Fix 1: Remove Duplicate Method Declaration
**File**: `MangaService/src/main/java/shadowshift/studio/mangaservice/repository/MangaRepository.java`

Removed the duplicate `existsByMelonSlug` method declaration at line 382, keeping only the original at line 38.

**Before**:
```java
List<Manga> findByMelonSlugIn(Collection<String> melonSlugs);

/**
 * Проверяет существование манги по slug источника.
 */
boolean existsByMelonSlug(String melonSlug);  // DUPLICATE - REMOVED
}
```

**After**:
```java
List<Manga> findByMelonSlugIn(Collection<String> melonSlugs);
}
```

### Fix 2: Remove Misplaced Validation Code
**File**: `MangaService/src/main/java/shadowshift/studio/mangaservice/service/MangaService.java`

Removed the `updateManga` validation code that was incorrectly placed in the `createManga` method.

**Before**:
```java
logger.info("Создание новой манги: {}", createDTO.getTitle());

try {
    if (StringUtils.hasText(updateDTO.getMelonSlug())) {  // WRONG CONTEXT
        String normalizedSlug = updateDTO.getMelonSlug().trim();
        String currentSlug = existingManga.getMelonSlug();
        if (!normalizedSlug.equals(currentSlug)
                && mangaRepository.existsByMelonSlug(normalizedSlug)) {
            throw new MangaValidationException(
                    "Манга с переданным Melon slug уже существует: " + normalizedSlug
            );
        }
    }
    Manga manga = mangaMapper.toEntity(createDTO);
```

**After**:
```java
logger.info("Создание новой манги: {}", createDTO.getTitle());

try {
    Manga manga = mangaMapper.toEntity(createDTO);
```

## Verification Results
✅ **MangaRepository.java**: No compilation errors  
✅ **MangaService.java**: No compilation errors  
✅ All 4 build errors resolved

## Build Command
```bash
docker-compose up --build manga-service
```

## Modified Files
1. `MangaService/src/main/java/shadowshift/studio/mangaservice/repository/MangaRepository.java`
   - Removed duplicate method declaration

2. `MangaService/src/main/java/shadowshift/studio/mangaservice/service/MangaService.java`
   - Removed misplaced validation code from createManga method

## Additional Fix: Duplicate Detection Restored

### Problem
After removing the misplaced validation code, the `createManga` method lost the ability to check if a manga with the same `melonSlug` already exists in the system.

### Solution
Added proper duplicate detection to `createManga` method:

```java
// Проверка на существование манги по melonSlug (если указан)
if (StringUtils.hasText(createDTO.getMelonSlug())) {
    String normalizedSlug = createDTO.getMelonSlug().trim();
    if (mangaRepository.existsByMelonSlug(normalizedSlug)) {
        throw new MangaValidationException(
                "Манга с переданным Melon slug уже существует: " + normalizedSlug
        );
    }
}
```

### How Duplicate Detection Works

The system now has **three methods** for manga management, all with proper duplicate detection:

#### 1. **`createManga(MangaCreateDTO createDTO)`** - General creation method
```java
// Проверка на существование манги по melonSlug (если указан)
if (StringUtils.hasText(createDTO.getMelonSlug())) {
    String normalizedSlug = createDTO.getMelonSlug().trim();
    if (mangaRepository.existsByMelonSlug(normalizedSlug)) {
        throw new MangaValidationException(
                "Манга с переданным Melon slug уже существует: " + normalizedSlug
        );
    }
}
```
- ✅ Checks if `melonSlug` is provided
- ✅ Validates that no manga with this `melonSlug` already exists
- ✅ Throws `MangaValidationException` if duplicate found

#### 2. **`createMangaFromMelon(...)`** - Melon import method
```java
if (StringUtils.hasText(createDTO.getMelonSlug())) {
    String normalizedSlug = createDTO.getMelonSlug().trim();
    if (mangaRepository.existsByMelonSlug(normalizedSlug)) {
        throw new MangaValidationException(
                "Манга с переданным Melon slug уже существует: " + normalizedSlug
        );
    }
}
```
- ✅ Same duplicate detection logic as `createManga`
- ✅ Specifically designed for importing from MelonService
- ✅ Prevents duplicate imports from external systems

#### 3. **`updateManga(Long id, MangaCreateDTO updateDTO)`** - Update method
```java
if (StringUtils.hasText(updateDTO.getMelonSlug())) {
    String normalizedSlug = updateDTO.getMelonSlug().trim();
    String currentSlug = existingManga.getMelonSlug();
    if (!normalizedSlug.equals(currentSlug)
            && mangaRepository.existsByMelonSlug(normalizedSlug)) {
        throw new MangaValidationException(
                "Манга с переданным Melon slug уже существует: " + normalizedSlug
        );
    }
}
```
- ✅ Checks if `melonSlug` has changed
- ✅ If changed, validates that the new slug is not already used by another manga
- ✅ Allows keeping the same slug during update
- ✅ Prevents slug conflicts between different manga

### Why melonSlug?
- The `melonSlug` field has `unique = true` constraint in the database (Manga entity, line 91):
  ```java
  @Column(name = "melon_slug", length = 255, unique = true)
  private String melonSlug;
  ```
- It's the primary identifier for manga coming from external sources (MelonService)
- This prevents duplicate imports of the same manga from external systems
- Database-level unique constraint provides additional safety

## Notes
- ✅ **Duplicate detection restored**: Both creation methods now properly check for existing manga by `melonSlug`
- The validation code was in the wrong place (using wrong variables), not wrong in concept
- The duplicate method in the repository was likely added accidentally during a merge or refactoring
- All fixes maintain the original functionality while resolving compilation errors and improving duplicate detection
