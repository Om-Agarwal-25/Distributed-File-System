# Distributed File Storage System (DFS)

A MERN-stack application that simulates a distributed file storage backend. Files are split into chunks, distributed across multiple Docker containers (simulated storage nodes), and managed using three core data structures: **B-Trees**, **Consistent Hashing**, and **Merkle Trees**.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Dashboard                          │
│   FileUpload · FileList · IntegrityBadge · NodeStatus           │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (REST API)
┌──────────────────────────▼──────────────────────────────────────┐
│                    Express.js Backend                           │
│  POST /upload · GET /file/:id · DELETE /file/:id · GET /verify  │
│                                                                 │
│  ┌─────────────┐  ┌────────────────────┐  ┌──────────────────┐  │
│  │   B-Tree    │  │ ConsistentHashing  │  │   MerkleTree     │  │
│  │  (metadata) │  │  (chunk routing)   │  │  (integrity)     │  │
│  └─────────────┘  └────────────────────┘  └──────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
         │ Persist      │ Distribute chunks
         ▼              ▼
    ┌─────────┐  ┌─────────────────────────────────────────┐
    │ MongoDB │  │  Storage Nodes (Docker Containers)      │
    │  (meta) │  │  node1:4001 · node2:4002 · node3:4003   │
    └─────────┘  └─────────────────────────────────────────┘
```

## Project Structure

```
DS2 cp/
├── backend/                    # Express.js API server
│   ├── src/
│   │   ├── dataStructures/
│   │   │   ├── BTree.js            # O(log n) metadata index
│   │   │   ├── ConsistentHashing.js# Virtual ring chunk router
│   │   │   └── MerkleTree.js       # Integrity verification
│   │   ├── services/
│   │   │   ├── chunkingService.js  # File → chunks + SHA-256
│   │   │   ├── storageService.js   # HTTP ↔ storage nodes
│   │   │   └── integrityService.js # Merkle re-verification
│   │   ├── controllers/
│   │   │   └── fileController.js   # Route handlers
│   │   ├── routes/
│   │   │   └── fileRoutes.js       # Express router
│   │   ├── models/
│   │   │   └── FileMetadata.js     # Mongoose schema
│   │   ├── middleware/
│   │   │   └── errorMiddleware.js  # 404 + global error
│   │   ├── utils/
│   │   │   └── logger.js           # Structured logger
│   │   └── app.js                  # Express factory
│   ├── server.js                   # Entry point
│   ├── .env                        # Local dev env vars
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                   # React dashboard
│   ├── public/index.html
│   └── src/
│       ├── components/
│       │   ├── FileUpload.js       # Drag-and-drop uploader
│       │   ├── FileList.js         # Paginated file table
│       │   ├── IntegrityBadge.js   # Merkle verify button
│       │   └── NodeStatus.js       # Hash ring visualiser
│       ├── services/api.js         # Axios API client
│       ├── App.js
│       ├── index.js
│       ├── index.css               # Dark theme design system
│       └── .env
│
├── storage-node/               # Lightweight storage container
│   ├── server.js               # PUT/GET/DELETE /chunks/:key
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml          # Orchestrates all services
├── .env.example                # Reference env config
└── package.json                # Root workspace
```

## Quick Start

### Option A — Docker Compose (recommended)

```bash
# 1. Clone and enter the project
cd "DS2 cp"

# 2. Start all services (MongoDB + 3 storage nodes + backend)
docker-compose up --build

# 3. Start the frontend separately
cd frontend && npm install && npm start
```

### Option B — Local Development

```bash
# Requirements: Node.js 20+, MongoDB running locally

# 1. Install deps
cd backend && npm install
cd ../frontend && npm install
cd ../storage-node && npm install

# 2. Start 3 storage nodes (in separate terminals)
PORT=4001 NODE_ID=node1 node storage-node/server.js
PORT=4002 NODE_ID=node2 node storage-node/server.js
PORT=4003 NODE_ID=node3 node storage-node/server.js

# 3. Start backend
cd backend && npm run dev

# 4. Start frontend
cd frontend && npm start
```

## API Endpoints

| Method | Endpoint        | Description                           |
|--------|-----------------|---------------------------------------|
| POST   | `/api/upload`   | Upload a file (multipart/form-data)   |
| GET    | `/api/file/:id` | Download a file by ID                 |
| DELETE | `/api/file/:id` | Delete a file                         |
| GET    | `/api/verify/:id`| Verify Merkle-Tree integrity         |
| GET    | `/api/files`    | List all files (paginated)            |
| GET    | `/api/nodes`    | List hash ring nodes                  |
| GET    | `/health`       | Backend health check                  |

## Core Data Structures

### B-Tree (`BTree.js`)
- Minimum degree `t = 3` (configurable)
- Stores `fileId → metadata` mappings in-memory for O(log n) lookups
- All 3 delete cases implemented: predecessor, successor, merge
- Also backs off to MongoDB for cache misses (warm-up on retrieval)

### Consistent Hashing (`ConsistentHashing.js`)
- MD5-based virtual node ring (150 virtual nodes/physical node default)
- Binary search ring lookup: O(log V)
- `addNode` / `removeNode` remaps only ~1/N fraction of chunks

### Merkle Tree (`MerkleTree.js`)
- Double-SHA-256 leaf hashing (second-preimage resistance)
- Standard odd-node duplication at each level
- `getProof(index)` and `verifyProof(leafHash, proof)` supported

## System Workflow

```
Upload:
  File → chunkFile() → SHA-256 each chunk → MerkleTree(hashes)
       → ConsistentHashing.getNode(chunkKey) per chunk
       → storageService.distributeChunks() → PUT /chunks/:key on node
       → BTree.insert(fileId, metadata)
       → MongoDB.create(metadata)

Download:
  fileId → BTree.search() || MongoDB lookup
         → storageService.reassembleFile()
         → Buffer.concat() → Response stream

Verify:
  fileId → fetch metadata → storageService.fetchChunks()
         → re-hash each chunk → new MerkleTree(freshHashes)
         → compare root → { intact, corruptedChunks }
```
>>>>>>> 77d4c3a (Made major ui changes)
