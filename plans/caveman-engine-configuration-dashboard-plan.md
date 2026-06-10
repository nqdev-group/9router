# Caveman Engine - Configuration & Dashboard Plan for 9router

## Overview
This plan outlines the implementation of a dedicated Caveman Engine configuration page and dashboard similar to the existing RTK Engine. The Caveman Engine injects terse-style system prompts to reduce output tokens by up to 65%.

## Current State
- Caveman functionality exists in:
  - `open-sse/rtk/caveman.js` - injector function
  - `open-sse/rtk/cavemanPrompts.js` - prompts for 6 levels (lite, full, ultra, wenyan-lite, wenyan, wenyan-ultra)
  - Integrated in `open-sse/handlers/chatCore.js` (lines 130-133)
  - Settings stored in `src/lib/db/repos/settingsRepo.js` (cavemanEnabled: boolean, cavemanLevel: string)
  - Basic UI controls in endpoint settings page (`src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`)
- Missing: Dedicated configuration page, API endpoints, and reusable components

## Goals
1. Create dedicated Caveman Engine configuration page at `/dashboard/settings/caveman-engine`
2. Add API endpoints for getting/updating caveman settings
3. Create reusable Caveman Engine components (LevelSelector, InfoPanel, TestPanel)
4. Add Caveman Engine to sidebar navigation
5. Ensure backward compatibility with existing endpoint settings

## Implementation Plan

### Phase 1: Backend API Endpoints
1. Create `src/app/api/settings/caveman/route.js`:
   - GET: Retrieve caveman settings (enabled, level)
   - PATCH: Update caveman settings with validation
2. Add caveman validation to `@9router/validation` package
3. Update settings repository to handle caveman settings properly

### Phase 2: Frontend Components
Create components in `packages/components/caveman/`:
1. `LevelSelector.js` - Radio buttons for caveman levels (6 options)
2. `InfoPanel.js` - Explain caveman benefits and show current level description
3. `TestPanel.js` - Test caveman compression on sample text
4. Export all components from `packages/components/caveman/index.js`

### Phase 3: Configuration Page
Create `src/app/(dashboard)/dashboard/settings/caveman-engine/page.js`:
- Master toggle switch for enabling/disabling
- Level selector with descriptions
- Info panel showing caveman benefits
- Test panel for live demonstration
- Save/Cancel buttons with loading states

### Phase 4: Integration
1. Add Caveman Engine to sidebar navigation in `src/shared/components/Sidebar.js`
2. Update endpoint settings to optionally hide caveman controls when using dedicated page
3. Ensure settings are properly loaded/saved from/to database
4. Add proper TypeScript/JSDoc comments where needed

### Phase 5: Testing
1. Verify caveman settings persist across restarts
2. Test all caveman levels work correctly with different provider formats
3. Ensure backward compatibility with existing endpoint settings
4. Test API endpoints return correct data and validation errors

## File Structure Changes

### New Files:
```
packages/components/caveman/
  LevelSelector.js
  InfoPanel.js
  TestPanel.js
  index.js
src/app/api/settings/caveman/route.js
src/app/(dashboard)/dashboard/settings/caveman-engine/page.js
src/lib/validation/cavemanSchemas.js (if needed)
```

### Modified Files:
- `src/lib/db/repos/settingsRepo.js` - ensure caveman settings handled properly
- `src/shared/components/Sidebar.js` - add caveman engine to systemItems
- `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js` - optionally hide caveman controls
- `packages/components/index.js` - export caveman components

## Dependencies
- Uses existing caveman injection logic (`open-sse/rtk/caveman.js`)
- Uses existing caveman prompts (`open-sse/rtk/cavemanPrompts.js`)
- Uses existing settings storage mechanism
- Reuses UI patterns from RTK Engine components

## Estimated Effort
- Backend API: 2-3 hours
- Frontend Components: 4-5 hours
- Configuration Page: 3-4 hours
- Integration & Testing: 2-3 hours
- Total: ~12-15 hours

## Risks & Mitigation
1. **Risk**: Breaking existing endpoint settings caveman controls
   **Mitigation**: Keep endpoint controls functional, add setting to hide them when using dedicated page
   
2. **Risk**: Invalid caveman level values
   **Mitigation**: Add validation in API endpoint and settings repository
   
3. **Risk**: UI inconsistency with RTK Engine
   **Mitigation**: Follow same patterns and component styles as RTK Engine

## Success Criteria
1. Caveman Engine page accessible at `/dashboard/settings/caveman-engine`
2. Page allows enabling/disabling caveman and selecting level (6 options)
3. Settings persist across server restarts
4. Caveman injection works correctly with all provider formats when enabled
5. API endpoints return correct settings and validation errors
6. Backward compatibility maintained with existing endpoint settings
7. Proper loading states and error handling in UI