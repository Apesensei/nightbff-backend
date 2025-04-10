## NightBFF: Complete User Journey Flow

## 1. Login & Onboarding

### Initial Signup & Authentication
- User downloads the app and opens to welcome screen
- Options to "Sign up with Apple," "Sign up with Email," or "Log in" if returning
- New users enter email/password or use social login
- App presents welcome message: "Connect with fellow night BFFs"

### Profile Creation
- **Personal Information**:
  - User enters display name
  - Writes a short bio (limited to 150 characters)
  - Selects birth date using scrolling date picker
- **ID Verification**:
  - User prompted to upload ID for age verification
  - Camera access requested for ID scan
  - Processing indicator shows verification in progress
- **Profile Details**:
  - Gender selection (Male/Female/Other options)
  - Nationality/country of residence selection from scrollable list
  - User selects up to 5 nightlife interests (Dancing, Live Music, Cocktails, etc.)
- **Profile Photos**:
  - User uploads primary profile photo (required)
  - Option to add 2+ additional photos
  - Photos undergo automated review

### Location & Permissions
- App requests location access with explanation: "To view nearby venues and nightlifers"
- Options for "Allow While Using App" or "Allow Once"
- User can optionally connect social profiles (Instagram/TikTok)
- Toggle for "Show me on the map to other users"

### Personalization & Completion
- User shown popular venues nearby based on selected interests
- Option to follow specific venues immediately
- Progress indicator shows profile completion percentage (e.g., "38% Complete")
- Final welcome screen with personalized message and suggestion to explore

## 2. Home Tab Experience

### Main Home Screen Layout
- Status bar shows app logo and user's first name at top
- Search bar for finding venues, plans, or users
- Section heading: "Trending Plans" with horizontal scrollable cards

### Trending Plans Section
- Each plan card shows:
  - Cover image (venue or user-uploaded)
  - Plan name (e.g., "Saturday Night Bar Hop")
  - Date/time information
  - Number of attendees (e.g., "8 nightlifers joined")
  - Location indicator (e.g., "Downtown" or specific venue name)
- "See all" button directs to full list of trending plans

### Your Plans Section
- Heading: "Plans you joined" with "See all" option
- If no plans joined: Friendly globe mascot with "No Plans Yet" message
- If plans exist: Horizontal scrollable cards showing joined plans
  - Each card shows basic plan info, date, and countdown (e.g., "Tonight!")

### Discover Venues Section
- Heading: "Discover venues" with "See all" option
- Grid of venue cards showing:
  - Venue thumbnail image
  - Venue name
  - Short location description
  - Rating indicator if available

### Venue Detail View
- When user taps venue card:
  - Full-screen image of venue at top
  - Venue name and follow button
  - Navigation tabs: Home/Nightlifers/Plans/Posts
  - Home tab shows venue description and similar venues
  - Nightlifers tab shows users who follow this venue
  - Plans tab shows upcoming events at this venue
  - Posts tab shows user content about this venue

## 3. Feed Tab Experience

### Feed Main View
- Search bar at top for searching within feed
- "Popular Destinations" section at top (for featured venues)
- Post stream below featuring:
  - User posts about venues/experiences
  - Plan announcements from users
  - Questions and tips from the community

### Post Components
- Each post shows:
  - User profile picture and name
  - Time posted (e.g., "2d" for 2 days ago)
  - Post content (text, possibly with images)
  - Location tag if attached to venue
  - Like and comment counts
  - Comment button with quick access to comment field

### Interaction Options
- Double-tap or heart icon to like posts
- Comment button expands to show comments and comment field
- Location tags are tappable and link to venue profiles
- Username and profile pictures link to user profiles
- Option to share posts via direct message or external platforms

### Content Creation from Feed
- "Write something..." prompt appears when scrolling to encourage participation
- Content filter automatically categorizes nightlife-appropriate content
- First-time posters see quick tutorial on community guidelines

## 4. Creating Plans & Posts (Middle Tab)

### Creation Hub
- When tapped, modal menu appears with three options:
  - "Create a plan" (primary option)
  - "Share a post"
  - "AI Itinerary" (Pro feature indicator)

### Plan Creation Flow
1. **Plan Name**:
   - Text field with "Enter plan name to get started" placeholder
   - Character limit indicator (60 characters)
   - Tips for effective names shown below

2. **About Trip**:
   - Description field for plan details
   - Guidance text: "A short description about your plan"
   - Suggestions for what to include (meeting point, dress code, etc.)

3. **Date & Time**:
   - Date picker for selecting date
   - Time selectors for start and end times
   - Toggle for "Flexible timing" option

4. **Venues**:
   - Venue search with Google Maps integration
   - Option to add multiple venues for multi-stop plans
   - Each added venue appears as removable chip
   - Option for "No specific venue" for flexible plans

5. **Interests**:
   - Selection of nightlife categories that match this plan
   - Options include: Live Music, Dancing, Cocktails, etc.
   - Selected interests appear highlighted

6. **Preferences & Settings**:
   - Plan visibility toggle (Public/Private)
   - Approval required toggle for join requests
   - Maximum attendees selector
   - Option to add external booking link (Pro feature)
   - Option to share plan to feed automatically

7. **Final Review & Creation**:
   - Preview card of how plan will appear
   - "Create Plan" button finalizes and publishes

### Post Creation Flow
1. **Context Selection**:
   - Dropdown to select venue or interest to tag
   - Option for general post with no specific tag

2. **Content Entry**:
   - Text field with "Share a travel tip or ask a question here..." prompt
   - Character count indicator
   - Option to add images via camera or gallery

3. **Visibility Settings**:
   - Public/Friends only toggle
   - Option to allow or disable comments

4. **Publishing**:
   - "Post" button in upper right corner
   - Brief animation confirms successful posting

### AI Itinerary Generator (Premium Feature)
- Information card explaining AI planning feature
- Input fields for:
  - Starting location or venue
  - Preferred night out style (e.g., "Relaxed", "High Energy")
  - Number of stops desired
  - Budget range
- "Generate" button with premium indicator
- Results shown as sequential stops with times and venue details
- Option to save generated itinerary as a plan

## 5. Map Experience (Fourth Tab)

### Map Main View
- Full-screen map centered on user's location
- Clusters of user profile circles indicating nearby users
- Search bar at top for location search
- Current location indicator and centering button

### Nearby Nightlifers Panel
- Bottom sheet shows "X Nearby Nightlifers"
- Horizontally scrollable profile cards showing:
  - Profile picture
  - User name
  - Country flag indicator
  - Distance (e.g., "1 mi")
  - Online status indicator (green dot when active)

### User Discovery
- Tapping profile circles on map reveals quick profile preview
- Preview shows name, basic info, and "Message" button
- Full profiles accessible through preview or nearby users panel
- Filters available for specific interests or venues

### Venue Discovery Mode
- Toggle in map corner switches between "Users" and "Venues"
- Venue mode shows pins for nightlife spots instead of users
- Venue pins color-coded by type (clubs, bars, lounges)
- Tapping venue pin shows quick info card with option to view full profile

### Safety Features
- Ghost mode toggle to hide user's location temporarily
- Precise location only shared with mutual connections
- Automatic deactivation after leaving app for set period

## 6. Chat & Messaging Experience (Fifth Tab)

### Chat Hub
- "Chats" header with "Requests (X)" indicator for pending messages
- Search bar for finding conversations
- If no messages: Mascot with "No Messages Yet" and encouragement
- Active conversations listed chronologically

### Plan Group Chats
- Plan chats appear with plan image and name
- Member count shown (e.g., "128 members")
- Preview of last message with timestamp
- Unread message indicator when applicable

### Chat Interface
- Plan name and details at top with back button
- Messages show sender name, profile picture, and timestamp
- Text bubbles color-coded by sender vs others
- Input field at bottom with send button
- Option to add images, location, or other attachments

### Direct Messaging
- Similar interface to group chats but with individual profile
- Online status indicator for active users
- Read receipts show when messages are seen
- Optional message reactions via long-press

### Connection Requests
- New connection requests appear at top of chat list
- Preview shows sender profile with accept/decline options
- Accepting moves conversation to regular chats
- Safety tips shown with first-time message requests

## 7. Profile & Settings

### My Profile View
- Profile completeness indicator with suggestions to improve
- Verification badge if ID verified successfully
- "View Profile" button to see public profile
- "Edit Profile" button for making changes

### Profile Management
- Edit options for:
  - Profile photos (add/remove/reorder)
  - Bio and personal information
  - Interests and preferences
  - Connected social accounts

### User Stats Section
- World map showing visited venues/cities
- Countries count and percentage indicator
- Interests displayed as tappable tags
- Languages spoken
- Upcoming plans preview

### Settings & Preferences
- Notification controls
- Privacy settings
- Account security options
- App appearance settings
- Help & Support access
- Logout option

## 8. Premium Features (NightBFF Pro)

### Upgrade Promotion
- Premium badge indicator on locked features
- "Get NightBFF Pro" button in profile
- Occasional tasteful promotion cards in feed

### Subscription Flow
- Feature comparison chart
- Pricing options (monthly/annual)
- Free trial offer
- Payment integration
- Confirmation screen

### Premium Capabilities
- **Teleport Feature**: Change virtual location to explore other cities
- **AI Night Planner**: Generate personalized itineraries
- **Advanced Filters**: Additional discovery options
- **Unlimited Connections**: No cap on friend requests
- **Profile Boosts**: Increased visibility in discovery
- **Add Links**: External booking links in plans

### Premium User Experience
- Gold verification badge indicating Pro status
- Priority support access
- Early access to new features
- Ad-free experience

## 9. Real-World Interaction Experiences

### Before the Night
- Push notification reminders about upcoming plans
- Group chat activity increases as event approaches
- Check-in button appears when plan start time approaches

### During the Event
- Location sharing options for plan members only
- Photo sharing in plan chat for memories
- Real-time updates from plan creator
- Nearby venues suggested if location changes

### After the Event
- Prompt to share photos/memories to feed
- Option to connect with new people met
- Suggestion to rate venues visited
- Prompt to create next plan based on interests

---

## Feature Comparison Notes

While TripBFF focuses on travel companions and plans across destinations, NightBFF maintains a similar interaction model but with important nightlife-specific adaptations:

- **Verification**: NightBFF adds ID verification for age-appropriate nightlife
- **Terminology**: "Travelers" becomes "Nightlifers"
- **Timeframe**: Focus on tonight/this weekend vs. longer-term travel plans
- **Venues**: Emphasis on nightlife establishments rather than destinations
- **Safety**: Enhanced features for nighttime meetups and real-time coordination
- **Content**: Moderation tailored to nightlife context and community standards


---
