***NOTE: The AWS/Terraform infrastructure deployment steps described here have been superseded by the local Docker Compose approach defined in 'performance-testing/P testing local.md'. This file is retained for historical context only.***

# Checklist for Completing Performance Testing TDL - Step 13: Deploy Services

**TDL Reference:** `Performance_Testing_Setup_TDL.md`
**Progress Tracker Reference:** `performance_testing_TDL_progress.md` (Step 13 status: "In Progress - File transfers pending user execution")

**Overall Goal:** Deploy all backend services (Application, Database, Redis, Monitoring, Mock Google Maps) to their respective dedicated EC2 instances using Docker Compose and the `.env.performance` configuration.

---

**CRITICAL PREREQUISITE: Resolve SSH Access**

*   **Action:** You **MUST** first troubleshoot and regain SSH access to the primary Application Server VM.
    *   **Command:** `ssh -i /Users/saeidrafiei/Downloads/NightBFF.pem ubuntu@18.191.165.122`
    *   **Note:** This IP and key are for the Application Server. You will need the specific IP addresses (and potentially different PEM key names if you used different ones during Terraform provisioning) for the other VMs (Database, Redis, Monitoring, Mock Server). These should have been outputted by your `terraform apply` command or available in your `terraform/outputs.tf` if defined.

---

## A. Application Server VM (`18.191.165.122`)

*(Perform these actions AFTER resolving SSH access to this VM)*

1.  **Verify `nightbff_app` Docker Image & Container:**
    *   [ ] **Check Build Status:** Confirm if the Docker build for `nightbff_app` (which used `RUN npm ci --only=production --legacy-peer-deps`) completed successfully.
        *   Command: `docker images | grep nightbff_app` (or the specific tag used).
    *   [ ] **Stop/Remove Old Containers:** If any old/partial `nightbff_app` containers exist, stop and remove them.
        *   Commands: `docker stop <container_id_or_name>`, `docker rm <container_id_or_name>`
    *   [ ] **Deploy Application Services:**
        *   Navigate to the directory on the VM containing your `docker-compose.app.yml` and `.env.performance` file.
        *   Command: `docker-compose -f docker-compose.app.yml --env-file .env.performance up -d`
    *   [ ] **Verify Container Status:** Ensure the `nightbff_app` container (or relevant service name from the compose file, e.g., `user`, `plan`, `venue`, `event`) is running.
        *   Command: `docker ps`
    *   [ ] **Check Logs:** Review application logs for errors.
        *   Command: `docker-compose -f docker-compose.app.yml logs <app_service_name_from_compose_file>` (e.g., `docker-compose -f docker-compose.app.yml logs plan`)

---

## B. Other Dedicated VMs

*(You will need the specific IP addresses and relevant SSH key files for each of these VMs, as provisioned by Terraform)*

### B.1. Database VM

*   **Target VM IP:** `[Enter DB VM IP Address Here]`
*   **SSH Key:** `[Enter Path to DB VM PEM Key Here, if different]`

1.  **Transfer Files:**
    *   [ ] Securely copy `docker-compose.db.yml` and `.env.performance` to the Database VM.
2.  **Deploy Database Service:**
    *   [ ] SSH into the Database VM.
    *   [ ] Navigate to the directory with the copied files.
    *   [ ] Command: `docker-compose -f docker-compose.db.yml --env-file .env.performance up -d`
3.  **Verify & Check Logs:**
    *   [ ] Command: `docker ps` (ensure `postgres` or `postgis/postgis` container is running)
    *   [ ] Command: `docker-compose -f docker-compose.db.yml logs postgres` (or the service name in your compose file)

### B.2. Redis VM

*   **Target VM IP:** `[Enter Redis VM IP Address Here]`
*   **SSH Key:** `[Enter Path to Redis VM PEM Key Here, if different]`

1.  **Transfer Files:**
    *   [ ] Securely copy `docker-compose.redis.yml` and `.env.performance` to the Redis VM.
2.  **Deploy Redis Service:**
    *   [ ] SSH into the Redis VM.
    *   [ ] Navigate to the directory with the copied files.
    *   [ ] Command: `docker-compose -f docker-compose.redis.yml --env-file .env.performance up -d`
3.  **Verify & Check Logs:**
    *   [ ] Command: `docker ps` (ensure `redis` container is running)
    *   [ ] Command: `docker-compose -f docker-compose.redis.yml logs redis`

### B.3. Monitoring VM

*   **Target VM IP:** `[Enter Monitoring VM IP Address Here]`
*   **SSH Key:** `[Enter Path to Monitoring VM PEM Key Here, if different]`

1.  **Transfer Files:**
    *   [ ] Securely copy `docker-compose.monitoring.yml` and `.env.performance` to the Monitoring VM.
    *   [ ] Also copy any necessary local Prometheus/Grafana configuration files if they are mounted as volumes by `docker-compose.monitoring.yml` and not part of a pre-built image.
2.  **Deploy Monitoring Services:**
    *   [ ] SSH into the Monitoring VM.
    *   [ ] Navigate to the directory with the copied files.
    *   [ ] Command: `docker-compose -f docker-compose.monitoring.yml --env-file .env.performance up -d`
3.  **Verify & Check Logs:**
    *   [ ] Command: `docker ps` (ensure `prometheus`, `grafana`, `node-exporter`, `cadvisor` containers are running)
    *   [ ] Check logs for each service, e.g., `docker-compose -f docker-compose.monitoring.yml logs prometheus`

### B.4. Google Maps Mock Server VM

*   **Target VM IP:** `[Enter Mock Server VM IP Address Here]`
*   **SSH Key:** `[Enter Path to Mock Server VM PEM Key Here, if different]`

1.  **Prepare Mock Server Image:**
    *   [ ] Ensure the mock server's Docker image is built and available on this VM. This might involve:
        *   Copying the mock server source code and its `Dockerfile`.
        *   Building the image: `docker build -t your-mock-server-image:latest .` (in the mock server code directory)
        *   (Alternatively, if pre-built and pushed to a registry, ensure Docker can pull it).
2.  **Transfer Files:**
    *   [ ] Securely copy `docker-compose.mock-google-maps.yml` and `.env.performance` to the Mock Server VM.
3.  **Deploy Mock Server Service:**
    *   [ ] SSH into the Mock Server VM.
    *   [ ] Navigate to the directory with the copied files.
    *   [ ] Command: `docker-compose -f docker-compose.mock-google-maps.yml --env-file .env.performance up -d`
4.  **Verify & Check Logs:**
    *   [ ] Command: `docker ps` (ensure the mock server container is running)
    *   [ ] Command: `docker-compose -f docker-compose.mock-google-maps.yml logs <mock_server_service_name>`

---

## C. Final Verification for Step 13 Completion

1.  **Basic Inter-Service Connectivity Checks:**
    *   [ ] **Application to DB/Redis:** From the application server, check application logs to confirm successful connections to the database and Redis services on their respective VMs.
    *   [ ] **Prometheus Scraping:** Access the Prometheus UI (e.g., `http://<Monitoring_VM_IP>:9090`) and check the "Targets" page to ensure Prometheus is successfully scraping metrics from configured targets (application server, node exporters, etc.).
    *   [ ] **Application to Mock Server:** If possible, perform a quick manual test of an application endpoint that relies on the Google Maps API to ensure it's hitting your mock server (check mock server logs and application response).

---

Once all these items are checked, Step 13 ("Deploy Services") of your `Performance_Testing_Setup_TDL.md` can be considered complete. 