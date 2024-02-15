import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';

function Webcam() {
  const videoRef = useRef(null);
  const videoCanvasRef = useRef(null); // Canvas for video content
  const overlayCanvasRef = useRef(null); // Canvas for overlay (oval boundary)
  const [faceInOvalTime, setFaceInOvalTime] = useState(0);

  useEffect(() => {
    // Load face-api.js models
    const loadModels = async () => {
      const MODEL_URL = '/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    };

    const accessWebcam = async () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            const video = videoRef.current;
            if (video) {
              video.srcObject = stream;
              video.onloadedmetadata = () => {
                video.play();
              };
            }
          })
          .catch(err => {
            console.error("Error accessing the webcam: ", err);
          });
      }
    };

    // Initialize face detection
    const initFaceDetection = async () => {
        await loadModels();
        await accessWebcam();

        const video = videoRef.current;
        const videoCanvas = videoCanvasRef.current;
        const overlayCanvas = overlayCanvasRef.current;

        let timeInOval = 0; // Variable to track time spent in oval
        let imageCaptured = false; // Flag to track whether image has been captured

        video.addEventListener('play', () => {
        faceapi.matchDimensions(videoCanvas, {
            width: video.offsetWidth,
            height: video.offsetHeight,
        });
        faceapi.matchDimensions(overlayCanvas, {
            width: video.offsetWidth,
            height: video.offsetHeight,
        });

        drawOvalBoundary(overlayCanvas, overlayCanvas.getContext('2d')); // Draw oval boundary on the overlay canvas

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions());
            const resizedDetections = faceapi.resizeResults(detections, {
            width: video.offsetWidth,
            height: video.offsetHeight,
            });

            videoCanvas.getContext('2d').clearRect(0, 0, videoCanvas.width, videoCanvas.height);
            let faceInOval = false; // Track if any face is in the oval
            resizedDetections.forEach(detection => {
            const box = detection.box;
            const ctx = videoCanvas.getContext('2d');
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Check if the face is within the oval boundary
            if (isWithinOvalBoundary(box, overlayCanvas) && !imageCaptured) {
                faceInOval = true; // Indicate that a face is within the oval
                timeInOval += 100; // Increment time spent in the oval

                // Check if the time spent in the oval exceeds 5000 milliseconds (5 seconds)
                if (timeInOval >= 10000) {
                  timeInOval = 0;
                  captureImage(videoCanvas); // Capture the webcam image
                  imageCaptured = true; // Set the flag to indicate image has been captured
                setTimeout(() => { imageCaptured = false; }, 500); // Optionally add a cooldown period before allowing another capture
                }
            } 
            });

            if (!faceInOval) {
                timeInOval = 0; // Reset time if no face is in the oval
            }
        }, 100);
        });
    };


    // Function to check if the face is within the oval boundary
    const isWithinOvalBoundary = (box, canvas) => {
      // Define the oval boundary
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radiusX = 150; // adjust according to your needs
      const radiusY = 200; // adjust according to your needs

      const deltaX = box.x + box.width / 2 - centerX;
      const deltaY = box.y + box.height / 2 - centerY;

      return (deltaX * deltaX) / (radiusX * radiusX) + (deltaY * deltaY) / (radiusY * radiusY) <= 1;
    };

    // Function to draw oval boundary
    const drawOvalBoundary = (canvas, ctx) => {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radiusX = 150; // adjust according to your needs
      const radiusY = 200; // adjust according to your needs

      ctx.beginPath();
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    // Function to capture the webcam image
    const captureImage = (canvas) => {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
        // Get the data URL of the captured image
        const dataURL = canvas.toDataURL();
    
        // Create a link and set its attributes
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = 'captured_image.png'; // You can set the filename here
    
        // Simulate a click on the link to trigger the download
        document.body.appendChild(link);
        link.click();
    
        // Remove the link from the document
        document.body.removeChild(link);
    };
  

    initFaceDetection();
  }, []);

  return (
    <div style={{ position: 'relative', width: '720px', height: '560px' }}>
      <video ref={videoRef} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={videoCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} width="720" height="560" />
      <canvas ref={overlayCanvasRef} style={{ position: 'absolute', top: 0, left: 0 }} width="720" height="560" />
    </div>
  );
}

export default Webcam;

