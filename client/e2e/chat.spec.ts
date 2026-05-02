import { test, expect, Page } from '@playwright/test';

// ── Shared login helper ────────────────────────────────────────────────────
async function login(page: Page) {
  await page.goto('/login');

  // Use exact selectors from Login.tsx: type="email" and type="password"
  await page.locator('input[type="email"]').fill('thiru@gmail.com');
  await page.locator('input[type="password"]').fill('Thiru@123');

  // Submit button has id="auth-submit-btn"
  await page.locator('#auth-submit-btn').click();

  // Wait until the app redirects away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12_000 });
  // Wait for the sidebar conversations to load from the API
  await page.waitForLoadState('networkidle');
  // Ensure at least one conversation item is rendered before proceeding
  await page.locator('[role="button"].slide-item').first().waitFor({ state: 'visible', timeout: 15_000 });
}

// ── Helper: click the first chat in the sidebar ───────────────────────────
async function openFirstChat(page: Page) {
  // ConversationItem renders with role="button" and class "slide-item"
  // Wait for at least one real conversation row (not the empty-state div)
  const firstChat = page.locator('[role="button"].slide-item').first();
  await firstChat.waitFor({ state: 'visible', timeout: 15_000 });
  await firstChat.click();
  // Wait for the message input to appear in the opened chat
  await page.locator('#message-input').waitFor({ state: 'visible', timeout: 15_000 });
}

// ── Test 1: Input bar is visible on mobile (not hidden behind browser bar) ─
test('Mobile Bug 1: Chat input is visible and not cut off by the viewport', async ({ page }) => {
  await login(page);
  await openFirstChat(page);

  // Screenshot: what the chat looks like right now
  await page.screenshot({ path: 'e2e/screenshots/01-chat-input-visible.png' });

  const input = page.locator('#message-input');
  const box = await input.boundingBox();
  const viewportHeight = page.viewportSize()!.height;

  // The bottom edge of the input MUST be within the visible viewport
  expect(box).not.toBeNull();
  const inputBottom = box!.y + box!.height;
  console.log(`📐 Input bottom: ${inputBottom}px  |  Viewport: ${viewportHeight}px`);
  expect(inputBottom).toBeLessThanOrEqual(viewportHeight);
});

// ── Test 2: Back button returns to sidebar on mobile ──────────────────────
test('Mobile Bug 2: Back button inside ChatWindow returns to sidebar', async ({ page }) => {
  await login(page);
  await openFirstChat(page);

  // --- BEFORE: chat is open ---
  await page.screenshot({ path: 'e2e/screenshots/02a-chat-open.png' });
  console.log('📸 Chat is open');

  // The back button has class "md:hidden" and type="button"
  const backBtn = page.locator('button[type="button"].md\\:hidden').first();
  await expect(backBtn).toBeVisible();

  // Click back — you will see the browser animate back to the sidebar
  await backBtn.click();

  // --- AFTER: sidebar should be visible, chat input should be gone ---
  await page.screenshot({ path: 'e2e/screenshots/02b-after-back.png' });
  console.log('📸 Back button clicked');

  // Chat input must no longer be visible
  const chatInput = page.locator('#message-input');
  await expect(chatInput).not.toBeVisible();

  // Sidebar search bar must be visible (proves we're back on the sidebar)
  const sidebarSearch = page.locator('#sidebar-search');
  await expect(sidebarSearch).toBeVisible();

  console.log('✅ Back button works — sidebar visible, chat closed');
});

// ── Test 3: Typing in the input enables the send button ───────────────────
test('Mobile Bug 3: Type a message and send button becomes active', async ({ page }) => {
  await login(page);
  await openFirstChat(page);

  const input = page.locator('#message-input');
  const sendBtn = page.locator('#send-btn');

  // Send button must be disabled when input is empty
  await expect(sendBtn).toBeDisabled();
  await page.screenshot({ path: 'e2e/screenshots/03a-send-disabled.png' });
  console.log('📸 Send button is disabled (correct)');

  // Type a message — you will visually see text appear in the input
  await input.click();
  await input.fill('Hello from Playwright! 👋');
  await page.screenshot({ path: 'e2e/screenshots/03b-text-typed.png' });
  console.log('📸 Text typed in input');

  // Send button should now be enabled
  await expect(sendBtn).toBeEnabled();
  console.log('✅ Send button activated after typing');

  // Press Enter to send
  await input.press('Enter');
  await page.screenshot({ path: 'e2e/screenshots/03c-message-sent.png' });
  console.log('✅ Message sent via Enter');

  // Input should be cleared after sending
  await expect(input).toHaveValue('');
});

// ── Test 4: Full login → chat → back → re-open flow ──────────────────────
test('Mobile Flow: Full user journey — login, open chat, go back, re-open', async ({ page }) => {
  await login(page);
  console.log('✅ Logged in');

  await openFirstChat(page);
  console.log('✅ Opened a chat');

  await page.screenshot({ path: 'e2e/screenshots/04a-first-chat.png' });

  // Go back to sidebar
  await page.locator('button[type="button"].md\\:hidden').first().click();
  await expect(page.locator('#sidebar-search')).toBeVisible();
  console.log('✅ Returned to sidebar');

  // Open a chat again
  await openFirstChat(page);
  await expect(page.locator('#message-input')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/04b-reopened-chat.png' });
  console.log('✅ Re-opened chat — full flow complete');
});
