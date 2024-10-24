let audioCtx;
let analyser;
let intervalId;
let canvas = document.getElementById('canvas');
let canvasCtx = canvas.getContext('2d');
canvasCtx.clearRect(0, 0, canvas.offsetWidth, canvas.height);
const dpr = window.devicePixelRatio || 1;
const padding = 10;
const canvasWidth = canvas.offsetWidth;
const canvasHeight = canvas.offsetHeight;

canvas.width = canvasWidth * dpr;
canvas.height = (canvasHeight + padding * 2) * dpr;
canvasCtx.scale(dpr, dpr);
let bufferLength, dataArray;
let isRecording = false;
let xPos = 0; // Starting x position for drawing the waveform
const silenceThreshold = 0.01; // Threshold to ignore small background noise
const samples = 10;
const canVasWidth = canvas.offsetWidth || 500
const intervalTime = 10;
const timeInput = document.getElementById('time')
const timer = document.getElementById('timer')
timeInput.value = 8;
let time = timeInput.value;
let widthContain = 0

let isTalk = false

// const data = [131, 166, 191, 143, 172, 152, 198, 120, 135, 145, 159, 124, 116, 143, 166, 158, 113, 146, 133, 123, 117, 140, 121, 109, 190, 111, 122, 244, 271, 325, 432, 388, 176, 199, 155, 170, 156, 208, 182, 151, 125, 201, 438, 767, 868, 869, 757, 645, 609, 588, 627, 435, 481, 570, 363, 246, 210, 171, 122, 150, 127, 133, 163, 240, 417, 463, 474, 593, 507, 418, 275, 251, 346, 355, 280, 299, 257, 357, 469, 428, 406, 326, 369, 279, 242, 139, 127, 133, 187, 159, 148, 141, 479, 503, 551, 873, 682, 601, 510, 384, 493, 443, 370, 261, 263, 282, 259, 204, 229, 199, 208, 204, 195, 253, 236, 224, 218, 232, 326, 360, 385, 438, 467, 402, 408, 535, 491, 415, 445, 490, 441, 527, 527, 544, 515, 443, 538, 410, 372, 412, 429, 342, 354, 351, 405, 420, 467, 425, 428, 521, 646, 914, 648, 548, 434, 404, 428, 314, 334, 365, 308, 328, 177, 216, 163, 183, 162, 209, 153, 191, 182, 175, 162, 177, 147, 139, 140, 121, 139, 116, 158, 144, 119, 180, 137, 140, 148, 133, 148, 149, 147, 178, 173, 151, 175, 181, 172, 168, 164, 161, 168, 213, 145, 199, 182, 167, 194, 178, 126, 167, 155, 167, 141, 171, 157, 144, 71]

// console.log(data.length)

// // equation to calculate the widthPerSample to match the time
// let widthSamplingRate = (intervalTime * canVasWidth) / (samples * time * 1000)
let widthSamplingRate = 0.01

const drawAudio = url => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
        .then(audioBuffer => draw(normalizeData(filterData(audioBuffer))));
};
// Set up the canvas
function setupCanvas() {
    canvas = document.getElementById('canvas');
    canvasCtx = canvas.getContext('2d');
    canvasCtx.clearRect(0, 0, canvas.offsetWidth, canvas.height);
    const dpr = window.devicePixelRatio || 1;
    const padding = 10;
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.offsetHeight;

    canvas.width = canvasWidth * dpr;
    canvas.height = (canvasHeight + padding * 2) * dpr;
    canvasCtx.scale(dpr, dpr);
    xPos = 0; // Reset x position when starting a new recording
}

timeInput.addEventListener('change', (event) => {
    time = event.target.value;
    widthSamplingRate = 100 / (time * 1000)
})
let recordingTimerId
let recordingTime = 0
let cTime
let nTime
// Capture audio and start logging
document.getElementById('startButton').addEventListener('click', async () => {
    isRecording = true;
    recordingTime = 0
    clearInterval(intervalId)
    cTime = Date.now()
    // Initialize AudioContext and AnalyserNode
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024; // Set FFT size
    bufferLength = analyser.fftSize;
    dataArray = new Float32Array(bufferLength); // Array to hold time domain data

    setupCanvas();

    // Capture microphone input
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);

    // Start logging and drawing the waveform every 100ms
    intervalId = setInterval(() => {
        if (isRecording && widthContain < canvas.offsetWidth) {
            analyser.getFloatTimeDomainData(dataArray); // Get live audio data
            const filteredData = filterData(dataArray);
            const normalizedData = normalizeData(filteredData); // Normalize the current chunk
            draw(normalizedData);
        } else {
            isRecording = false;
            isTalk = false;
            widthContain = 0
            clearInterval(recordingTimerId)
            clearInterval(intervalId)
            nTime = Date.now();
            timer.innerHTML = nTime - cTime
        }
    }, intervalTime);
    recordingTimerId = setInterval(() => {
        recordingTime += 1;
        timer.innerHTML = recordingTime
    }, 1000)

    // Disable start button and enable stop button
    document.getElementById('startButton').disabled = true;
    document.getElementById('stopButton').disabled = false;
});

// Stop recording
document.getElementById('stopButton').addEventListener('click', () => {
    isTalk = false;
    widthContain = 0
    clearInterval(recordingTimerId)
    isRecording = false;
    clearInterval(intervalId); // Stop logging data
    if (audioCtx) {
        audioCtx.close(); // Close AudioContext
    }

    console.log("Stopped recording.");

    // Enable start button and disable stop button
    document.getElementById('startButton').disabled = false;
    document.getElementById('stopButton').disabled = true;
});

let blockSize
// Filter the data into samples and average blocks, applying a silence threshold
const filterData = (audioData) => {
    const rawData = audioData.getChannelData(0);
    blockSize = Math.floor(rawData.length / samples); // Number of samples in each subdivision
    // console.log(rawData, 'block')
    const filteredData = [];


    for (let i = 0; i < blockSize; i++) {
        let sum = 0;
        let blockStart = samples * i; // the location of the first sample in the block
        for (let j = 0; j < samples; j++) {
            sum += Math.abs(rawData[blockStart + j]); // find the sum of all the samples in the block
        }

        // Apply the silence threshold to filter out low-level noise
        const average = sum / samples;
        console.log(average)
        filteredData.push(average < silenceThreshold ? 0 : average);
    }

    return filteredData;
};

// Normalize the filtered data, but avoid normalizing to very low amplitudes
const normalizeData = (filteredData) => {
    const maxAmplitude = Math.max(...filteredData);
    if (maxAmplitude === 0) return filteredData; // If everything is 0, don't normalize

    const multiplier = 1 / maxAmplitude;
    return filteredData.map(n => n * multiplier);
};
let cnt = 0;
// Draw the waveform on the canvas using drawLineSegment style
const draw = (normalizedData) => {
    const canvasWidth = canvas.offsetWidth;
    const canvasHeight = canvas.height;
    const widthSample = (canvasWidth) / blockSize;



    // Don't clear the canvas so previous data remains
    // Draw each sample segment like before
    for (let i = 0; i < normalizedData.length; i++) {
        // if (widthContain >= canvasWidth) {
        //     isRecording = false
        //     return; // Stop if the canvas width is reached
        // }


        const x = xPos;
        let height = normalizedData[i] * canvasHeight; // Scale to half the canvas height
        console.log(height, canvasHeight)
        // Use the same drawLineSegment approach for the spikes
        drawLineSegment(canvasCtx, x, height, widthSample, (i + 1) % 2);

        xPos += canVasWidth / blockSize; // Move to the next x position


        widthContain += canVasWidth / blockSize
        // console.log(widthSample, widthContain, widthSamplingRate, xPos)
    }
};
// let isEven = false
// Function to draw a line segment in the waveform (spike-like visualization) with Y-axis centered
const drawLineSegment = (ctx, x, y, width, isEven) => {
    ctx.lineWidth = 0.5; // Line thickness
    ctx.strokeStyle = "blue"; // Line color
    ctx.fillStyle = "blue"; // Fill color (semi-transparent blue)

    // Y-axis centered
    const centerY = canvas.height / 2;

    ctx.beginPath();

    ctx.moveTo(x, centerY); // Start at the center

    if (y === 0) {
        // If y is 0, draw a horizontal line
        ctx.lineTo(x + width, centerY); // Straight line at the center
        ctx.stroke(); // Draw the outline of the shape
    } else {
        // Draw the spike symmetric above and below the center
        ctx.lineTo(x, centerY - y); // Upwards from the center
        ctx.lineTo(x + width, centerY - y); // Continue the spike horizontally
        ctx.lineTo(x + width, centerY + y); // Downwards symmetric spike
        ctx.lineTo(x, centerY + y); // Close the path back to the start
    }

    // Close the shape
    ctx.closePath();

    // Fill and stroke the shape
    ctx.fill(); // Fill the shape with color
};

drawAudio('./1.mp3');
