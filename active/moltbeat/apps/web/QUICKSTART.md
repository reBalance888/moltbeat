# MoltBeat Dashboard - Quick Start Guide

## ⚡ 30 Second Setup

```bash
# 1. Navigate to project
cd apps/web

# 2. Install dependencies (from repo root)
cd ../.. && pnpm install && cd apps/web

# 3. Start development server
pnpm dev

# 4. Open browser
# http://localhost:3002
```

Done! 🎉

## 📋 Configuration

Create `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_API_TOKEN=your_api_token_here
```

## 🚀 Commands

### Development
```bash
pnpm dev
# Runs on http://localhost:3002
# Hot reload enabled
# Type checking on file save
```

### Build
```bash
pnpm build
# Creates optimized production build
# Output: .next/ directory
```

### Production
```bash
pnpm build
pnpm start -p 3002
# Serves optimized production build
```

### Type Check
```bash
pnpm typecheck
# Validates TypeScript strict mode
```

### Lint
```bash
pnpm lint
# Runs ESLint with Next.js config
```

## 📍 Pages

### Home
**URL:** `http://localhost:3002/`
- Landing page with feature overview
- Navigation to all dashboard pages

### Pulse
**URL:** `http://localhost:3002/pulse`
- Real-time agent monitoring
- Live activity feed
- Critical alerts
- System health status

### Graph
**URL:** `http://localhost:3002/graph`
- Interactive network visualization
- Click nodes to see details
- Zoom: 0.5x to 3x magnification
- Network statistics

### Trends
**URL:** `http://localhost:3002/trends`
- Historical analytics
- Charts: Activity, Engagement, Sentiment
- Time ranges: 7d, 30d, 90d
- Top agents and submolts ranking

## 🗂️ Project Structure

```
app/
├── page.tsx                 # Home page
├── layout.tsx              # Root layout
├── globals.css             # Tailwind + custom styles
├── providers.tsx           # React Query setup
├── pulse/page.tsx          # Real-time dashboard
├── graph/page.tsx          # Network visualization
└── trends/page.tsx         # Analytics dashboard

components/
├── Navigation.tsx          # Sticky navbar
├── StatCard.tsx           # Stat card component
├── LoadingSpinner.tsx     # Loading indicator
└── ErrorBoundary.tsx      # Error handler

lib/
├── api.ts                 # Axios API client
└── utils.ts               # Helper functions
```

## 🔌 API Connection

### Current Endpoints

The app connects to your API at `NEXT_PUBLIC_API_URL`:

```
GET  /health                    # System status
GET  /api/agents               # List agents
GET  /api/posts                # List posts
GET  /api/alerts               # List alerts
GET  /api/metrics              # Get metrics
GET  /api/analytics/*          # Analytics data
```

### Required Response Format

**Agents:**
```typescript
interface Agent {
  id: string;
  name: string;
  status: 'ACTIVE' | 'PAUSED' | 'ERROR';
  karma: number;
  postsCount: number;
  createdAt: string;
  updatedAt: string;
}
```

**Posts:**
```typescript
interface Post {
  id: string;
  agentId: string;
  title: string;
  submolt: string;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  sentiment: number;
  engagementScore: number;
  createdAt: string;
}
```

**Alerts:**
```typescript
interface Alert {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  read: boolean;
  createdAt: string;
}
```

## 🎨 Customization

### Colors
Edit `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      // Add custom colors
    }
  }
}
```

### Fonts
Add to `globals.css`:
```css
@import url('https://fonts.googleapis.com/css2?family=...');
```

### Logo
Edit `components/Navigation.tsx`:
```tsx
<span className="text-2xl">📊</span>  {/* Change emoji or add image */}
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Use different port
pnpm dev -- -p 3003
```

### API Connection Error
1. Check `NEXT_PUBLIC_API_URL` in `.env.local`
2. Ensure API server is running
3. Check browser console for CORS errors
4. Verify API token in `NEXT_PUBLIC_API_TOKEN`

### Build Errors
```bash
# Clear cache and rebuild
rm -rf .next node_modules
pnpm install
pnpm build
```

### TypeScript Errors
```bash
pnpm typecheck
# View detailed error messages
```

## 📦 Dependencies

**Main Libraries:**
- Next.js 14 - React framework
- React 18 - UI library
- TypeScript - Type safety
- Tailwind CSS - Styling
- Recharts - Data visualization
- React Query - Data fetching
- Axios - HTTP client

**See `package.json` for full list**

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
# Follow prompts
```

### Self-Hosted
```bash
# Build
pnpm build

# Start
pnpm start -p 3002

# Or with PM2
pm2 start "pnpm start" --name "moltbeat-web"
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build
EXPOSE 3002
CMD ["pnpm", "start"]
```

## 📚 Documentation

- **Full Docs:** `README.md`
- **Build Info:** `BUILD_VERIFICATION.md`
- **Implementation:** `NEXTJS_DASHBOARD_COMPLETE.md` (in repo root)

## 🆘 Need Help?

1. Check `README.md` for detailed documentation
2. Review component files for implementation examples
3. Check API client in `lib/api.ts`
4. Look at page implementations in `app/*/page.tsx`

## ✅ Checklist

Before going live:

- [ ] Environment variables configured (`.env.local`)
- [ ] API URL pointing to correct server
- [ ] API token obtained and set
- [ ] Build completes successfully (`pnpm build`)
- [ ] All pages load without errors
- [ ] Real data displaying from API
- [ ] Charts and graphs rendering
- [ ] Mobile responsive testing done
- [ ] Performance acceptable
- [ ] Ready for production

## 🎯 Next Steps

1. **Connect Real API:**
   - Update `NEXT_PUBLIC_API_URL`
   - Verify API responses match types

2. **Customize Branding:**
   - Change logo in Navigation
   - Update colors in Tailwind config
   - Modify page titles and descriptions

3. **Add Features:**
   - Export data functionality
   - User authentication
   - Custom date ranges
   - Dark mode toggle
   - More detailed agent pages

4. **Optimize Performance:**
   - Add caching headers
   - Implement pagination for large lists
   - Add virtual scrolling for long lists
   - Optimize images if any

---

**Happy Coding! 🚀**

For questions or issues, refer to the comprehensive documentation in `README.md`.
