# #User Profiles & Authentication Frontend PRD

UI Components

- <TextInput>: For email, password, and username input fields with real-time validation.
- <Button>: For login, registration, and profile save actions.
- <Image>: For profile photo display and gallery thumbnails.
- Expo AuthSession: To handle OAuth flows for Apple, Google, and Facebook logins.
- <Modal>: For age verification and onboarding steps.

User Flows

- Login Screen: User enters email/password or selects social login → Validation → Home Screen on success.
- Registration Screen: Email/password input → Age verification modal (Onfido integration) → Profile setup → Home Screen.
- Profile Editing: Profile Screen → Edit button → Form with photo upload, bio, and preferences → Save → Updated Profile Screen.

Expo Considerations

- Use Expo AuthSession for seamless social authentication, ensuring iOS compatibility with native dialogs.
- Leverage Expo ImagePicker for profile photo uploads with camera/gallery access.
- Implement Expo Location for optional location permissions during onboarding, with clear opt-in prompts.

# #Map & Venue Discovery Frontend PRD

UI Components

- <MapView>: Interactive map with venue pins, zoom, and pan controls.
- <FlatList>: Scrollable list for venue search results or nearby options.
- <SearchBar>: Text input for venue/location queries.
- Expo Location: To fetch and display the user’s current position.
- <TouchableOpacity>: For venue pin interactions and filter buttons.

User Flows

- Map Screen: Displays user location and venue pins → Tap pin → Venue Detail Modal with info and check-in option.
- Search Flow: Tap search bar → Enter query → Results update <MapView> and <FlatList> → Select venue → Detail Modal.
- Filter Flow: Tap filter icon → Select venue type/music → Map updates with filtered pins.

Expo Considerations

- Use Expo Location for geolocation, limiting free users to a 5-mile radius with background updates disabled unless "Tonight Mode" is active.
- Integrate Expo MapView with Google Maps provider for iOS, caching tiles for offline use.
- Optimize <MapView> rendering with clustering for dense venue areas to maintain performance.

# #Community Feed & Social Engagement Frontend PRD

UI Components

- <ScrollView>: For infinite scrolling of feed posts.
- <Image>: To display user-generated photos and venue tags.
- <TextInput>: For post creation and comments.
- <TouchableOpacity>: For like, comment, and share actions.
- Expo Camera: For in-app photo capture during content creation.

User Flows

- Feed Browsing: Home Screen → Scroll through posts → Tap post → Detail view with comments.
- Post Creation: Tap "Create Post" → Add text/photos → Tag venue/location → Set visibility → Submit → Feed updates.
- Engagement: Tap like/comment on post → Modal for comment input → Real-time update in feed.

Expo Considerations

- Use Expo Camera for photo capture with permissions handling tailored to iOS guidelines.
- Implement Expo Notifications for real-time interaction alerts (e.g., likes, comments).
- Optimize <ScrollView> with lazy loading to reduce memory usage on image-heavy feeds.

# # Real-time chat  & Messaging Frontend PRD.

UI Components

- <FlatList>: For chat message history with real-time updates.
- <TextInput>: For message composition with media/location options.
- <Image>: To display shared media in chat.
- Expo Notifications: For incoming message alerts.
- <ActivityIndicator>: For typing and delivery status.

User Flows

- Chat List: Chat Tab → View conversations → Tap to open chat → Scroll messages.
- New Message: Tap "New Chat" → Select user(s) → Compose message → Send → Chat opens.
- Media Sharing: Chat Screen → Tap media icon → Select photo/location → Send → Updates chat.

Expo Considerations

- Leverage Expo Notifications for push alerts, respecting iOS background limitations.
- Use Expo WebSocket or Supabase real-time subscriptions for live message delivery.
- Optimize <FlatList> with virtualization for long chat histories to ensure smooth scrolling.

# #Event Planning & Management Frontend PRD

UI Components

- <ScrollView>: For event list with infinite scroll.
- <TextInput>: For event title, description, and search.
- <DatePicker>: For selecting event start/end times.
- <MapView>: To display event location.
- Expo Calendar: For optional calendar integration.

User Flows

- Event Browsing: Events Tab → Scroll events → Tap event → Detail Screen with RSVP option.
- Event Creation: Tap "Create Event" → Fill form (title, time, location) → Preview → Submit → Event added to list.
- RSVP Flow: Event Detail → Tap RSVP → Select status (going/maybe) → Updates attendee list.

Expo Considerations

- Use Expo Calendar to sync events with iOS calendar, requesting permissions contextually.
- Integrate Expo Location for venue selection with map preview in creation flow.
- Implement Expo Notifications for event reminders, optimized for iOS delivery.

# #Premium Subscription Features Frontend PRD

UI Components

- <Button>: For "Upgrade to Premium" calls-to-action.
- <View>: To display premium badge on profile and expanded map radius.
- <Modal>: For subscription plan selection and purchase confirmation.
- Expo InAppPurchases: For native payment processing.
- <Text>: To highlight premium-only features in UI.

User Flows

- Discovery: Map Screen → Radius limit hit → "Upgrade" prompt → Premium benefits Modal.
- Purchase: Tap "Upgrade" → Select plan (monthly/annual) → Native payment flow → Confirmation → Unlocked features.
- Management: Profile → Premium section → View status → Change/cancel options.

Expo Considerations

- Use Expo InAppPurchases for seamless iOS payment integration with RevenueCat validation.
- Implement Expo Notifications for renewal reminders, respecting iOS background limits.
- Dynamically adjust <MapView> radius based on subscription status via Expo Location.
