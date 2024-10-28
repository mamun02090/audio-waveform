async function processAudioData(audioFile, intervalMs = 1) {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const response = await fetch(audioFile);
    const audioData = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(audioData);
    const channelData = audioBuffer.getChannelData(0); // Get mono channel data

    // Calculate the interval in samples (1 ms worth of samples)
    const sampleRate = audioBuffer.sampleRate;
    const interval = Math.floor((sampleRate / 1000) * intervalMs);
    const duration = channelData.length;  // Total samples in the buffer

    const aggregatedData = [];

    // Process each 1 ms segment
    for (let i = 0; i < duration; i += interval) {
        // Extract 1 ms segment
        const segment = channelData.slice(i, i + interval);

        // Calculate the average absolute amplitude
        const avgAmplitude = segment.reduce((acc, sample) => acc + Math.abs(sample), 0) / segment.length;

        // Append integer amplitude data to match Python's int conversion
        aggregatedData.push(Math.round(avgAmplitude * 32767));  // Scale for 16-bit PCM representation
    }

    // Output JSON data for comparison
    console.log(JSON.stringify(aggregatedData));
    return aggregatedData;
}

// Usage example
const audioFile = './1 (1).mp3';
processAudioData(audioFile, 1).then(aggregatedData => {
    console.log("Aggregated Amplitude Data (1ms intervals):", Math.max(...aggregatedData));
});
