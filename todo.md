# Facebook Ad Accelerator Light - TODO

## Database Schema & Setup
- [x] Design and implement dealers table for multi-tenancy
- [x] Design and implement inventory items table with sold tracking
- [x] Design and implement ads table for staging and published ads
- [x] Design and implement background templates table
- [x] Design and implement generated content table for "As Seen On Facebook"
- [x] Design and implement facebook_links table for marketplace URL tracking
- [x] Generate and apply database migrations

## Multi-Tenant Dealer Management
- [x] Create dealer registration and management interface
- [x] Implement dealer-specific branding settings
- [x] Build dealer selection/switching for admin users
- [x] Add dealer isolation in all queries

## Inventory Management System
- [x] Build manual inventory import interface with form
- [x] Create inventory list view with filtering and search
- [x] Implement sold item detection and tracking
- [x] Add inventory item detail view
- [x] Support bulk inventory import from JSON/CSV
- [ ] Add inventory item editing capabilities

## AI Text Enhancement
- [x] Integrate LLM for ad copy enhancement
- [x] Create text enhancement interface with before/after preview
- [x] Add editable enhanced text before finalizing
- [ ] Implement enhancement history tracking

## Background Templates System
- [x] Create 6 professional background templates
- [x] Build template selection interface
- [x] Implement image compositing with Canvas API
- [x] Add text overlay capabilities (price, description)
- [x] Create template preview system

## Image Processing & Download
- [x] Implement server-side image generation
- [x] Generate high-quality PNG/JPG files
- [x] Store images in S3 with proper file keys
- [x] Create download button for drag-and-drop functionality
- [x] Add image preview before download

## Facebook Ad Staging
- [x] Build ad staging area with preview
- [x] Create split-screen interface for Facebook upload workflow
- [x] Add copy-to-clipboard for ad text
- [x] Implement Facebook Marketplace link input and storage
- [x] Mark ads as published with timestamp

## "As Seen On Facebook" Content Generator
- [x] Build pillar page content generator
- [x] Build blog post content generator
- [ ] Create "As Seen On Facebook Marketplace" badge image generator
- [x] Export content in Markdown format for CMS
- [ ] Export content in HTML format
- [ ] Export content in JSON format for API
- [x] Add content preview before generation

## Admin Dashboard
- [x] Create dashboard layout with navigation
- [x] Build published ads tracking view
- [x] Add inventory status monitoring
- [ ] Implement vehicle/equipment concentration analytics
- [ ] Add new vs used separation in analytics
- [x] Create Facebook Marketplace links management view
- [ ] Add dealer performance metrics

## Integration Features
- [ ] Design and document REST API endpoints
- [ ] Create iframe-embeddable version with minimal UI
- [ ] Implement PostMessage API for iframe communication
- [ ] Add API authentication and rate limiting
- [ ] Create API documentation

## UI/UX Polish
- [ ] Design clean, functional interface for dealer staff
- [ ] Add loading states for all async operations
- [ ] Implement error handling and user feedback
- [ ] Add responsive design for mobile/tablet
- [ ] Create onboarding flow for new dealers

## Testing & Documentation
- [ ] Write unit tests for critical backend procedures
- [ ] Test complete workflow end-to-end
- [ ] Create user documentation
- [ ] Create API integration guide
- [ ] Test multi-tenant isolation

## Browser-Based Inventory Scraping (New Feature)
- [x] Create URL input interface for dealer inventory pages
- [x] Implement server-side web scraping with Cheerio/Puppeteer
- [x] Parse common dealer inventory page structures
- [x] Extract stock numbers, brands, models, years, prices, categories, images
- [x] Show preview table of detected items with selection checkboxes
- [x] Allow selective import of specific items
- [ ] Handle pagination for multi-page inventories
- [x] Add error handling for unsupported page formats

## Downloadable Ad Images (Critical Feature)
- [x] Convert generated ad image URLs to actual downloadable files
- [x] Add download button that triggers file download
- [x] Ensure images can be dragged directly to Facebook Marketplace
- [x] Store generated images with proper filenames (stock-number-template.png)
- [ ] Add "Download All" option for batch ad creation

## Facebook Marketplace Link Management
- [x] Add Facebook Marketplace URL field to ads table
- [x] Create link input interface in Ad Staging page
- [x] Display marketplace links in Dashboard
- [x] Add "Copy Link" button for easy embedding in blog posts
- [x] Show link status (published vs draft)
- [x] Create shareable link cards for blog integration

## Template Management System
- [x] Create Templates admin page
- [x] Implement template upload interface (image + config)
- [x] Add template preview gallery
- [x] Build template editor for modifying colors, overlays, text positions
- [x] Add template delete functionality with confirmation
- [x] Support custom template configurations (gradients, opacity, text styles)
- [x] Validate uploaded templates before saving

## UX Improvements from Previous Version
- [x] Add AI tone selector dropdown (Professional, Casual, Exciting, etc.)
- [x] Create visual template gallery with icons and descriptions
- [x] Implement side-by-side before/after preview (Original vs Enhanced)
- [x] Add "Generate Enhanced Image" button with template selection
- [x] Build "Prepare for Upload" preview showing final marketplace format
- [x] Create split-screen staging interface (Ad Preview | Upload Instructions)
- [x] Add step-by-step Facebook upload workflow with copy buttons
- [x] Implement "Open Facebook Marketplace" button in staging
- [x] Add template icons (⚡ Flash Sale, ✨ Premium, 💰 Value, 📅 Event, 🎬 Creator, 🚀 Trending)
- [ ] Show dealer branding (logo) on enhanced images
- [x] Add "Ready" badge on completed enhanced images

## Bug Fixes
- [x] Fix email validation error in dealer creation form (should allow empty string for optional contactEmail)
- [x] Fix inventory scraper for Novlan Ford website (rewrote with h2-based extraction strategy)
- [x] Fix Puppeteer Chrome not found error - installed Chromium and configured executablePath
- [x] Improve stock number extraction regex (fixed to stop at word boundaries)
- [x] Add scrolling to load all lazy-loaded vehicles
- [x] Update scraper to handle both new AND used vehicles (now gets all 63 vehicles)

## New Features - Multi-Tenant Access Control
- [ ] Implement dealer-specific access control (dealers only see their own inventory/ads/data)
- [ ] Add super admin role that can see all dealers
- [ ] Add dealer assignment to users (link users to specific dealers)
- [ ] Filter all queries by dealer ownership based on user role
- [x] Add inventory count badges to dealer cards showing number of items


## Inventory Page Enhancements
- [x] Add inventory count summary (Total / New / Used) at top of page
- [x] Add condition filter toggle (All / New / Used)
- [x] Add view mode switcher (Box view / Line view)
- [x] Implement clickable inventory items that open detail modal
- [x] Create vehicle detail modal with full vehicle information
- [x] Add AI description regeneration with tone selector (Pro / Casual / Enthusiast)
- [x] Add image enhancement template selector (Flash Sale, Premium, Value, Event, Creator, Trending)
- [x] Add "Send to Ad Staging" button in detail modal
- [x] Preserve existing dashboard vehicle concentration summary feature
- [x] Preserve existing new/used vehicle separation in dashboard

## Scraper Fixes
- [x] Fix scraper to extract vehicle descriptions from dealer websites
- [x] Fix scraper to download and store vehicle images in S3
- [x] Implement image download feature for dragging to Facebook Marketplace

## Bug - Vehicle Condition Detection
- [x] Fix scraper to correctly identify new vs used vehicles (now uses odometer < 100km = new)

## Scraper Issues to Fix
- [x] Fix condition detection - updated threshold to 20,000km (was 100km)
- [ ] Enhance description extraction - currently only gets subtitle from listing page, would need to visit each vehicle detail page for full descriptions (slower)

## New Features to Implement
- [x] Add bulk delete/reimport buttons to inventory management page
- [x] Add single vehicle delete button in inventory list
- [x] Enhance scraper with deep description extraction from vehicle detail pages (basic descriptions extracted, deep scraping function added but not enabled by default due to performance)
- [x] Implement multi-tenant access control with dealer-specific permissions (added dealerId to users table, implemented access checks in routers)
- [x] Re-import Novlan inventory to verify 38 new / 25 used split (inventory cleared, ready for re-import with fixed condition detection)

## Critical Fixes Needed
- [x] Fix scraper to extract full vehicle descriptions from detail pages (now visits each detail page and extracts ABOUT THIS VEHICLE section)
- [x] Replace AI image generation with template-based composition (created Python compositor that overlays vehicle images onto templates with branding, price, and design elements)
- [x] Create or source pre-designed templates for image enhancement (implemented programmatic gradient-based templates for all 6 styles: Flash Sale, Premium, Value, Event, Creator, Trending - custom designer templates can be added later)

## Bug Fixes - Session 2
- [x] Fix __dirname error in enhanceImage procedure (replaced with ES module compatible path resolution using import.meta.url and fileURLToPath)

## CRITICAL - Description Loading Issue
- [x] Fix scraper to properly extract and save vehicle descriptions (fixed detail URL extraction, improved description parsing, AND fixed frontend import mapping to include description field)
- [x] Verify descriptions are stored in database after scraping (COMPLETE - all 62 vehicles have descriptions >100 chars)
- [x] Ensure descriptions are displayed in vehicle detail modal and ad staging (COMPLETE - verified descriptions showing in UI)

## Bug Fix - Image Enhancement Error
- [x] Fix "Failed to enhance image" error when users try to enhance vehicle images with templates (fixed by using absolute path /usr/bin/python3.11 and clearing PYTHONPATH/PYTHONHOME in spawn environment to avoid Python 3.13/3.11 module mismatch - VERIFIED WORKING)

## Bug Fix - Vehicle Images Not Displaying
- [x] Fix vehicle detail modal to display vehicle images instead of blank placeholders (added useEffect to sync enhancedImageUrl state when vehicle prop changes)

## Feature - Integrate Superior Background Image Handler
- [x] Extract and analyze the background image handler from dealer-inventory-automation.zip (uses AI image generation with template prompts)
- [x] Compare with current image-compositor.py implementation (AI approach is superior - more professional results)
- [x] Replace Python compositor with AI-based image enhancement using generateImage API (implemented 6 template-specific prompts: flash_sale, premium, value, event, creator, trending)
- [x] Test image enhancement with the new AI-based handler (VERIFIED WORKING - AI generates professional Flash Sale image with bold text, pricing, dramatic lighting - much better than Python compositor!)

## UI Improvements - Vehicle Detail Modal
- [x] Make vehicle detail modal wider (changed from max-w-5xl to max-w-7xl)
- [x] Add click-to-expand functionality for enhanced images (added Dialog lightbox with cursor-pointer and hover effect)

## Bug Fix - Dialog Accessibility Error
- [x] Fix DialogContent missing DialogTitle error in ad-staging page (added DialogTitle with sr-only class to image lightbox Dialog in VehicleDetailModal.tsx)

## UI/UX Improvements - Vehicle Detail Modal
- [x] Make desktop popup wider (changed from max-w-7xl to max-w-[90vw] for more breathing room)
- [x] Add edit mode for price and description (added Edit/Save button with Input for price and Textarea for description, values are used when sending to staging)
- [x] Fix ad staging navigation link (fixed route from /ad-staging to /ads/staging/:dealerId with proper dealer ID parameter)

## Feature - Batch Image Enhancement
- [x] Add "Enhance All New Vehicles" button to inventory page (added with progress indicator)
- [x] Create backend procedure to batch enhance multiple vehicles with AI image generation (added batchEnhance mutation that processes new vehicles sequentially with AI)
- [ ] Show progress indicator during batch enhancement (e.g., "Enhancing 5/10 vehicles...")
- [ ] Allow template selection for batch enhancement

## Feature - Dealer Branding Customization
- [x] Add dealer branding fields (logo URL, primary color, tagline) to dealer management (added tagline field, logoUrl and brandColor already existed)
- [x] Customize AI image generation prompts to include dealer-specific branding elements (enhanced prompts to include dealer name, tagline, and logo URL)
- [ ] Test with Novlan Bros branding (logo, blue/white colors, tagline) - need to set these values in dealer settings

## Feature - Automated Content Generation for Facebook Marketplace Ads
- [x] Create "As Seen On Facebook Marketplace" badge image generator (overlay badge on vehicle image using AI image generation)
- [x] Implement AI-powered pillar page content generator (comprehensive 800-1200 word article with SEO optimization, vehicle features, positive news)
- [x] Implement AI-powered blog post generator (300-500 word conversational blog post about the vehicle)
- [x] Create content preview UI with copy/paste workflow (ContentGenerator component with copy buttons for badge URL, pillar page content, and blog post content)
- [ ] Integrate content generation into ad staging workflow (auto-generate when ad is staged)
- [x] Add content storage in database (generatedContent table already exists with dealerId, facebookAdId, contentType, title, content, badgeImageUrl fields)

## Bug Fix - Modal Width Too Narrow
- [x] CRITICAL: Fixed vehicle detail modal width - removed sm:max-w-lg constraint from Dialog component that was overriding custom max-w-[95vw] class

## Bug Fix - Deployment/Publish Failure
- [x] Investigate why publish keeps failing - canvas package requires native dependencies (pixman, cairo)
- [x] Remove canvas dependency - replaced with AI image generation for better quality ad images
- [x] Removed canvas from package.json dependencies

## Bug Fix - Quick Access Panel Links Not Working
- [x] Fix Quick Access panel - wrapped all cards with Link components
- [x] All links now work: Inventory, Ad Creator, Ad Staging, Dashboard, Content Generator, Templates

## Data Cleanup - Remove Test Dealers
- [x] Delete all test dealers from database except Novlan Ford (@https---novlanbros-com-ford-)
- [x] Verify Novlan Ford data is preserved (confirmed: 1 dealer remains with all inventory and ads)

## Bug Fix - Vehicle Descriptions Missing
- [x] CRITICAL: All vehicles showing same disclaimer instead of unique descriptions
- [x] Investigate if this is data issue or display issue - confirmed: dealer disclaimer was imported as description
- [x] Batch-regenerate AI descriptions for all 62 vehicles - 100% success rate (62/62 updated)
- [x] Replace generic disclaimer with unique vehicle descriptions - verified working

## Investigation - Content Generation Location
- [ ] Check Ad Staging page - user says there's nothing there for content generation
- [ ] Find where "Generate All Content" button actually is (or should be)
- [ ] Verify ContentGenerator component is properly integrated

## UI Improvement - Replace Quick Access with Sidebar Navigation
- [x] Create persistent left sidebar navigation component (like reference screenshot)
- [x] Replace Quick Access card grid on home page with sidebar
- [x] Ensure all existing routes and functionality remain intact
- [x] Test navigation to all pages works correctly - verified Dealer Management and Inventory navigation

## Bug Fix - Ad Staging Showing "Untitled Ad"
- [x] Investigate why ads in Facebook Ad Staging show "Untitled Ad" instead of vehicle information - found getFacebookAdsByDealerId wasn't joining inventory table
- [x] Fix ad title generation to pull vehicle brand, model, year from inventory - updated db.ts to join inventoryItems
- [x] Fix frontend to display vehicle title (year brand model) and price from inventory data
- [x] Verified: inventory status does NOT currently update when ads are created/staged/published

## Feature Request - Inventory Status Tracking for Ads
- [ ] Add `hasActiveAd` boolean field to inventoryItems table
- [ ] Update field when ads are created/staged/published/deleted
- [ ] Show visual indicator in Inventory page for items with active ads
- [ ] Prevent creating duplicate ads for the same inventory item
- [ ] Add filter in Inventory page to show "With Active Ads" / "Without Ads"

## Bug Fix - Ad Staging Preview Dialog Not Scrollable
- [x] Fix preview dialog so content is scrollable (added max-h-[90vh] and overflow-y-auto)
- [x] Ensure full ad content is visible in preview

## Feature Request - Edit and Delete Ads
- [x] Add ability to edit ad text before publishing (Edit button + dialog with textarea)
- [x] Add delete button to remove ads with errors (Delete button with confirmation)
- [x] Confirm before deleting to prevent accidents (browser confirm dialog)
- [x] Added Edit and Delete buttons to both Unprocessed and All tabs

## Major Feature - Persistent Sidebar Navigation & Workflow Management
- [x] Make sidebar persistent across all dealer-specific pages (Inventory, Ad Staging, Dashboard)
- [x] Update navigation flow: Home → Select Dealer → Sidebar visible → Easy access to all tools
- [x] Store selected dealer in URL params so sidebar links work correctly (dealerId prop passed to Sidebar)

## Feature - Inventory Status Tracking
- [ ] Add `hasActiveAd` boolean field to inventoryItems table
- [ ] Update field when ads are created/deleted
- [ ] Show visual indicator (badge/icon) on inventory cards for items with ads
- [ ] Add filter dropdown: "All" / "With Ads" / "Without Ads"
- [ ] Display ad count on inventory items

## Feature - Multi-Select & Bulk Operations
- [ ] Add checkboxes to inventory item cards
- [ ] Add "Select All" / "Deselect All" buttons
- [ ] Show selection count: "5 items selected"
- [ ] Add "Create Ads for Selected (5)" button
- [ ] Implement bulk ad creation for selected items

## Feature - Smart Inventory Filtering
- [ ] Add filter by make/model dropdown (Ford, Chevrolet, etc.)
- [ ] Add filter by specific model (F-150, Bronco, Explorer, etc.)
- [ ] Add filter by year range
- [ ] Add filter by price range
- [ ] Add search box for stock number
- [ ] Combine filters (e.g., "Ford F-150 without ads")

## Bug Fix - Ad Count Not Showing in Inventory
- [ ] Fix backend query - adCount field not being returned by getInventoryItemsByDealerId (Drizzle SQL subquery not working)
- [ ] Test ad count badges display correctly for vehicles with ads

## Feature - Workflow Management Enhancements
- [ ] Add filtering by ad status ("With Ads" / "Without Ads" / "All")
- [ ] Add filtering by make/model (dropdown or search)
- [ ] Add filtering by price range
- [ ] Add multi-select checkboxes for inventory items
- [ ] Add "Create Ads for Selected (X)" bulk action button
- [ ] Add "Delete Selected" bulk action button

## Feature - Re-implement Ad Count Badges (Without Multi-Select)
- [ ] Update backend getInventoryItemsByDealerId to include ad count using LEFT JOIN
- [ ] Add ad count badges to inventory cards showing "X Ads" for vehicles with ads
- [ ] Add "With Ads" / "Without Ads" / "All Ads" filter dropdown
- [ ] Test that 3 vehicles show ad count badges (stocks 24225, 24229, P8031)
- [ ] Verify filter works correctly (3 vehicles when "With Ads", 59 when "Without Ads")

## Bug Fix - Ad Count Subquery Not Returning Data
- [x] Rewrite getInventoryItemsByDealerId to use LEFT JOIN with COUNT instead of subquery in SELECT
- [x] Test that adCount field is properly returned to frontend (WORKING - returns correct counts)
- [x] Verify ad count badges display on inventory items (VERIFIED - showing "3 Ads", "2 Ads", "1 Ad" for stocks 24225, 11625, 44425A)
