/**
 * AudioWorkletProcessor - 오디오 처리를 별도 스레드에서 수행
 * ScriptProcessorNode의 현대적 대체제
 */

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;

    // VAD 설정
    this.vadThreshold = 0.01;
    this.silenceFrames = 0;
    this.silenceThreshold = 25; // ~0.5초 침묵
    this.isSpeaking = false;
    this.speechStarted = false;

    // 메시지 수신 (메인 스레드에서 설정 변경)
    this.port.onmessage = (event) => {
      if (event.data.type === 'setVadThreshold') {
        this.vadThreshold = event.data.value;
      } else if (event.data.type === 'setSilenceThreshold') {
        this.silenceThreshold = event.data.value;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;

    const channelData = input[0];

    // 진폭 계산 (RMS)
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    // VAD (Voice Activity Detection)
    const isVoiceActive = rms > this.vadThreshold;

    if (isVoiceActive) {
      this.silenceFrames = 0;
      if (!this.isSpeaking) {
        this.isSpeaking = true;
        this.speechStarted = true;
        this.port.postMessage({ type: 'vadState', speaking: true });
      }
    } else {
      this.silenceFrames++;
      if (this.isSpeaking && this.silenceFrames > this.silenceThreshold) {
        this.isSpeaking = false;
        this.port.postMessage({ type: 'vadState', speaking: false });
      }
    }

    // 진폭 전송 (시각화용)
    this.port.postMessage({ type: 'amplitude', value: rms });

    // 버퍼에 데이터 추가
    for (let i = 0; i < channelData.length; i++) {
      this.buffer[this.bufferIndex++] = channelData[i];

      // 버퍼가 가득 차면 전송
      if (this.bufferIndex >= this.bufferSize) {
        // Float32 -> Int16 변환
        const int16Buffer = new Int16Array(this.bufferSize);
        for (let j = 0; j < this.bufferSize; j++) {
          const s = Math.max(-1, Math.min(1, this.buffer[j]));
          int16Buffer[j] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // 음성 활동 중일 때만 전송 (또는 항상 전송 옵션)
        this.port.postMessage({
          type: 'audioData',
          buffer: int16Buffer.buffer,
          isVoiceActive: this.isSpeaking || this.speechStarted,
        }, [int16Buffer.buffer]);

        // 버퍼 초기화
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
        this.speechStarted = false;
      }
    }

    return true;
  }
}

/**
 * 재생 오디오 진폭 분석기
 */
class AudioPlaybackAnalyzer extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0]) return true;

    // 패스스루 (입력을 출력으로)
    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];
      if (inputChannel && outputChannel) {
        outputChannel.set(inputChannel);
      }
    }

    // 진폭 계산
    const channelData = input[0];
    let sum = 0;
    for (let i = 0; i < channelData.length; i++) {
      sum += channelData[i] * channelData[i];
    }
    const rms = Math.sqrt(sum / channelData.length);

    this.port.postMessage({ type: 'playbackAmplitude', value: rms });

    return true;
  }
}

registerProcessor('audio-capture-processor', AudioCaptureProcessor);
registerProcessor('audio-playback-analyzer', AudioPlaybackAnalyzer);
