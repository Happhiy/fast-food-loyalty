# Fast-Food Loyalty System - Development Plan

## Design Guidelines

### Design References (Primary Inspiration)
- **McDonald's App**: Clean, accessible, food-focused design
- **Starbucks Rewards**: Clear points visualization, gamification
- **Style**: Modern Fast-Food + Accessible + High Contrast

### Color Palette
- Primary: #DC2626 (Red-600 - fast-food brand color)
- Secondary: #FEF3C7 (Amber-100 - warm accent)
- Success: #16A34A (Green-600 - positive actions)
- Background: #FFFFFF (White - clean, food-safe)
- Text: #1F2937 (Gray-800 - high readability)
- Muted: #6B7280 (Gray-500 - secondary text)

### Typography
- Heading1: Inter font-weight 700 (36px)
- Heading2: Inter font-weight 600 (28px)
- Heading3: Inter font-weight 600 (20px)
- Body/Normal: Inter font-weight 400 (16px)
- Body/Emphasize: Inter font-weight 600 (16px)
- Navigation: Inter font-weight 500 (14px)

### Key Component Styles
- **Buttons**: Red primary (#DC2626), white text, 8px rounded, hover: darken 10%
- **Cards**: White background, subtle shadow, 12px rounded, border gray-200
- **Forms**: White inputs with border, focus: red ring
- **Progress Bar**: Red fill, gray background, rounded full

### Layout & Spacing
- Max width: 1200px for desktop, full width for mobile
- Section padding: 24px vertical, 16px horizontal
- Card spacing: 16px gaps
- Mobile-first responsive design

### Images to Generate
1. **loyalty-hero-banner.jpg** - Fast-food restaurant interior with happy customers, warm lighting (Style: photorealistic, inviting atmosphere)
2. **points-reward-icon.png** - Stylized coin or star icon representing loyalty points (Style: flat design, red and gold colors)
3. **coupon-badge.png** - Coupon or voucher badge design with "1000 Ft" text (Style: flat design, red background)
4. **admin-dashboard-bg.jpg** - Modern POS system or tablet in restaurant setting (Style: photorealistic, professional)

---

## Development Tasks

### 1. Project Setup & Structure
- Update index.html title and meta tags
- Create folder structure: src/pages, src/components, src/lib, src/types
- Set up TypeScript interfaces for Customer, Purchase, Coupon
- Create mock data utilities and local storage helpers

### 2. Authentication System
- Create Login page (/login) with loyalty ID + email fields
- Implement Hungarian error messages ("Hibás azonosító vagy email", "Kérjük töltse ki az összes mezőt")
- Add role-based routing (admin vs customer)
- Store auth state in localStorage
- Create protected route wrapper component

### 3. Customer Dashboard (/home)
- Display points progress with visual indicator (X/100)
- Show purchase history table (date, amount, points earned)
- Implement "Kupon beváltása" button (visible when points >= 100)
- Add auto-refresh every 5 minutes (300 seconds)
- All text in Hungarian ("Pontok", "Vásárlások", "Kupon beváltása")

### 4. Customer Coupons Page (/coupons)
- Display two sections: "Felhasználható" and "Beváltva"
- Show coupon code, value (1000 Ft), creation date
- Visual distinction between available and redeemed coupons
- All text in Hungarian

### 5. Admin Dashboard (/admin)
- Customer management: add, edit, delete customers
- Record purchase form with amount input and automatic point calculation
- Point calculation: floor(amount/100) × role_multiplier (normal: 1.1, loyal: 1.4, owner: 1.7)
- Issue coupon: deduct 100 points, create coupon with unique code
- Redeem coupon: mark coupon as redeemed
- Customer list with search/filter functionality
- All admin text in English

### 6. Data Management & Mock Database
- Create localStorage-based mock database
- Implement CRUD operations for Customer, Purchase, Coupon
- Seed initial data (1 admin user, 3 sample customers)
- Generate unique loyalty IDs and coupon codes
- Implement point calculation logic with role multipliers
- Track visits counter increment on each purchase

### 7. Components & UI Elements
- CustomerCard component (display customer info)
- PurchaseTable component (list purchases)
- CouponCard component (display coupon with status)
- PointsProgress component (visual progress bar)
- AdminForm components (add customer, record purchase, issue coupon)
- Navigation component with role-based menu items

### 8. Styling & Responsiveness
- Apply design system consistently
- Ensure mobile-first responsive design
- Add hover states and transitions
- Implement loading states for actions
- Add success/error toast notifications

### 9. Testing & Final Check
- Test login flow for both admin and customer
- Verify point calculation with different roles
- Test coupon issuance and redemption
- Check auto-refresh functionality
- Verify Hungarian text on customer pages
- Cross-browser testing
- Run lint and build commands