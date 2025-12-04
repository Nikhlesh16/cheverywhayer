# 🧪 Testing Guide

## Quick Start: Test the New Features

### Test 1: Create Your First Community ✨

1. **Open the app**: http://localhost:3000
2. **Login** with your credentials (or register if needed)
3. **Look at the map** - You'll see H3 hexagons
4. **Click on any hexagon** on the map
5. **Right panel will show**: "Create Community"
6. **Enter a name**: e.g., "Downtown Delhi Hub"
7. **Click "Create Community"**
8. **Post something**: e.g., "Just discovered an amazing cafe here! ☕"

✓ **You've created your first community!**

---

### Test 2: Communities Are Isolated 🔒

1. **Select a different region** (click another hexagon)
2. **Create another community**: e.g., "Park District"
3. **Verify**: The post from previous region is NOT visible
4. **Switch back** to first region
5. **Verify**: Your original post IS visible

✓ **Posts are properly isolated by region!**

---

### Test 3: Anyone Can Post (No Membership) 🌐

**Open Two Browser Windows** (or tabs in incognito):

**Window A (Account 1)**:
1. Login as User 1
2. Select Region "Downtown"
3. See "Create Community"
4. Create community: "Main Street"
5. Close browser/logout

**Window B (Account 2)**:
1. Login as User 2 (or register new account)
2. Navigate to same region on map
3. See community "Main Street" ALREADY EXISTS
4. Can immediately POST without joining
5. Post something: "Love this place!"

✓ **Open access works - no membership approval needed!**

---

### Test 4: Real-Time Updates 📡

**Window A (Account 1)**:
1. Select "Main Street" community
2. See existing posts

**Window B (Account 2)**:
1. In same community "Main Street"
2. Write a post: "New cafe opened!"
3. Click "Post"

**Back to Window A**:
- See the new post from Account 2 appear INSTANTLY
- No page refresh needed

✓ **Real-time WebSocket updates working!**

---

### Test 5: Different Accounts Same Region 👥

**Account A**:
1. Create community in Region A: "Tech Park"
2. Post: "Engineering hub here"

**Account B**:
1. Go to same Region A
2. See "Tech Park" community (created by A)
3. Post: "Great networking space"

**Account C**:
1. Go to Region A
2. See both posts
3. Post: "Agree, very productive"

✓ **All users see same community content!**

---

## API Testing with cURL

### Test: Get Posts for a Region (Public - No Auth)

```bash
# Find a region's H3 index first
# Replace {H3_INDEX} with actual value from map

curl -X GET "http://localhost:3001/posts/883dad0a51fff" \
  -H "Content-Type: application/json"
```

**Expected Response** (HTTP 200):
```json
[
  {
    "id": "post-123",
    "content": "Great location!",
    "user": {
      "id": "user-456",
      "name": "John",
      "email": "john@example.com"
    },
    "createdAt": "2025-12-04T12:00:00Z"
  }
]
```

---

### Test: Create Community

```bash
curl -X POST "http://localhost:3001/workspaces/h3/883dad0a51fff" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Community",
    "description": "A community for downtown area"
  }'
```

**Expected Response** (HTTP 201):
```json
{
  "id": "workspace-123",
  "h3Index": "883dad0a51fff",
  "name": "Downtown Community",
  "description": "A community for downtown area",
  "createdAt": "2025-12-04T12:00:00Z",
  "updatedAt": "2025-12-04T12:00:00Z"
}
```

---

### Test: Get Community (Public)

```bash
curl -X GET "http://localhost:3001/workspaces/h3/883dad0a51fff" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "id": "workspace-123",
  "h3Index": "883dad0a51fff",
  "name": "Downtown Community",
  "members": [
    { "userId": "user-1", "username": "alice" }
  ],
  "posts": [
    { "id": "post-1", "content": "..." }
  ]
}
```

---

### Test: Post to Community (Requires Auth)

```bash
# Get token first from login
curl -X POST "http://localhost:3001/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Use the token in next request
curl -X POST "http://localhost:3001/posts/883dad0a51fff" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {YOUR_JWT_TOKEN}" \
  -d '{
    "content": "This is my first post!"
  }'
```

---

## Debugging

### Check Backend Logs
```bash
docker logs hyperlocal-backend -f
```

### Check Frontend Logs
```bash
docker logs hyperlocal-frontend -f
```

### Check Database
```bash
# Connect to PostgreSQL
psql -h localhost -U postgres -d hyperlocal_db

# View workspaces
SELECT id, h3Index, name FROM workspaces;

# View posts
SELECT id, content, "workspaceId" FROM posts;

# View region memberships
SELECT * FROM region_memberships;
```

---

## Common Issues & Solutions

### Issue: Posts not appearing after creation
**Solution**: Check backend logs for errors. Verify workspace exists with:
```bash
curl -X GET "http://localhost:3001/workspaces/h3/{H3_INDEX}"
```

### Issue: Community doesn't load
**Solution**: Refresh page (Ctrl+F5). Check browser console (F12) for errors.

### Issue: Real-time updates not working
**Solution**: Check WebSocket connection in browser DevTools → Network. Should see "ws://localhost:3000/socket.io".

### Issue: 404 when creating community
**Solution**: Verify H3 index format. Should be exactly 15 characters starting with '8' (for resolution 8).

---

## Feature Verification Checklist

- [ ] Can select different regions on map
- [ ] Right panel shows different community for each region
- [ ] Can create community with custom name
- [ ] Posts isolated per region
- [ ] Can post without explicit membership
- [ ] Real-time updates when others post
- [ ] Community name persists on page refresh
- [ ] Multiple accounts can see same posts
- [ ] Switching regions doesn't lose posts
- [ ] Can create multiple communities in different regions

---

## Performance Notes

- **Redis Caching**: Community data cached for 5 minutes
- **Database Indexing**: Posts indexed by workspaceId for fast queries
- **WebSocket**: Real-time updates for all clients in region
- **Pagination**: Posts use limit/offset for scalability

---

**All tests passing? 🎉 You're ready to use the platform!**

