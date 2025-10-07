<h1 align="center">Tawk</h1>

<h2>Introduction</h2>

<p>
  <b>Tawk</b> is a <b>realtime communication suite </b> with video calling and media sharing feature,
  and scalable message pipeline built my Apache Kafka and Redis Pub/Sub architecture
</p>

<br/>


---

##  Tech Stack

| Layer | Tech |
|-------|------|
| **Framework** | [Next.js](https://nextjs.org/), [Express.js](https://expressjs.com/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/) |
| **Pub Sub amd Messaging** | [Redis](https://redis.io/), [Kafka](https://kafka.apache.org/) |
| **Object Storage** | [AWS S3] |
| **Video Call** | Mediasoup |
| **Authentication** | Built from scratch  |
| **UI** | TailwindCSS + ShadCN/UI + TypeScript |
| **Deployment** | Vercel (frontend ) , EC2 + nginx (backend)|

---


<h2> Setup Instructions</h2>

<p>
Follow these steps to set up <b>Tutorr</b> locally on your system.
</p>

---

<h3> Clone the Repository</h3>

```bash
git clone https://github.com/Tiru-99/Tawk
cd tawk
```

<h3>Add Environment Variables</h3> <p> You need to create <code>.env</code> files in the following locations: </p>


<br/> 
<h4>Sample <code>.env</code> Configuration</h4>

```
# Env for frontend folder 
NEXT_PUBLIC_BACKEND_URL =http://localhost:5000 or your prod link 
NEXT_PUBLIC_BUCKET_NAME = your s3 bucket name  # Make sure the bucket is public 


# Env for backend folder


DATABASE_URL=
JWT_SECRET =
FRONTEND_URL =http://localhost:3000
FRONTEND_URL_2=http://localhost:3000/call/234
AWS_ACCESS_KEY=
AWS_SECRET_ACCESS_KEY=
REDIS_PASSWORD=
REDIS_HOST=localhost
KAFKA_BROKER=
REDIS_PORT=6379
REDIS_URL=
NODE_ENV=development # or "production" if in prod
ANNOUNCED_IP= your device's public ip 
```

<br/>
<h4> Installing dependencies and running the project</h4>

```bash
# Run this command at both frontend and backend folder to run the project
npm install
npm run dev
```

<h2>License</h2>

<p>
This project is licensed under the <b>MIT License</b> — see the <a href="./LICENSE" target="_blank">LICENSE</a> file for details.
</p>













