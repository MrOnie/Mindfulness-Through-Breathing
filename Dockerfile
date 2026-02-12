# 1. Use an official Python base image (based on Debian)
FROM python:3.11-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Install operating system dependencies
# Update the package list and install ffmpeg.
# This is the CRUCIAL step for .mp3 processing to work.
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg libopus-dev opus-tools && \
    # Clear apt cache to keep image small
    rm -rf /var/lib/apt/lists/*

# 4. Copy Python Requirements File
COPY requirements.txt .

# 5. Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy the rest of the application code to the container
COPY . .

# 7. Expose the port on which the Flask application is running
EXPOSE 5000

# 8. Command to run the application when the container starts
# Listen on 0.0.0.0 to make it accessible from outside the container
CMD ["python", "app.py"]