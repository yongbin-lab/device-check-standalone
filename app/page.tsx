'use client';

import { useState, useRef, useEffect } from 'react';

type TestState = 'idle' | 'recording' | 'playing' | 'success' | 'error';

export default function DeviceCheckPage() {
  const [testState, setTestState] = useState<TestState>('idle');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const testScript = "안녕하세요. 수업 전 테스트 중입니다.";

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Waveform 시각화 함수
  const drawWaveform = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    analyser.getByteFrequencyData(dataArray);

    // 평균 오디오 레벨 계산
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    setAudioLevel(average);

    // 캔버스 클리어
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Waveform 그리기
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = (dataArray[i] / 255.0) * canvas.height;
      
      const hue = (i / bufferLength) * 60; // 파란색에서 초록색으로
      ctx.fillStyle = `hsl(${200 + hue}, 70%, 50%)`;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      
      x += barWidth + 1;
    }

    if (testState === 'recording') {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  // 녹음 시작
  const startRecording = async () => {
    try {
      setPermissionDenied(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // AudioContext 설정
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      // MediaRecorder 설정
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setRecordedBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        
        // 자동 재생
        setTimeout(() => {
          playRecording(blob);
        }, 500);
      };

      setTestState('recording');
      mediaRecorder.start();
      drawWaveform();

      // 5초 후 자동 정지
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000);

    } catch (error) {
      console.error('마이크 접근 오류:', error);
      setPermissionDenied(true);
      setTestState('error');
    }
  };

  // 녹음 정지
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      setTestState('idle');
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  // 녹음된 오디오 재생
  const playRecording = (blob?: Blob) => {
    const audioBlob = blob || recordedBlob;
    if (!audioBlob) return;

    setTestState('playing');
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
      setTestState('success');
      URL.revokeObjectURL(audioUrl);
    };
    
    audio.onerror = () => {
      setTestState('error');
      URL.revokeObjectURL(audioUrl);
    };
    
    audio.play();
  };

  // 테스트 재시작
  const resetTest = () => {
    setTestState('idle');
    setRecordedBlob(null);
    setAudioLevel(0);
    setPermissionDenied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        
        {/* 헤더 영역 */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">🎙️ 기기 상태 점검</h1>
          <p className="text-2xl text-gray-700 mb-4">내 목소리가 잘 들리는지 확인해보세요</p>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            마이크로 말한 내용이 내 스피커로 들리면 온라인 수업에 적합한 상태예요.
          </p>
        </div>

        {/* 마이크 테스트 카드 */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 mb-8">
          
          {/* 음성 안내 */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-6">🎙️</div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">아래 문장을 읽어보세요:</h3>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-8 mb-8">
              <p className="text-2xl font-medium text-blue-900">&ldquo;{testScript}&rdquo;</p>
            </div>
          </div>

          {/* 녹음 버튼 및 상태 */}
          <div className="text-center mb-8">
            {testState === 'idle' && (
              <button
                onClick={startRecording}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-2xl px-16 py-8 rounded-3xl transition-all shadow-xl hover:shadow-2xl transform hover:scale-105"
              >
                🎙️ 녹음 시작하기
              </button>
            )}

            {testState === 'recording' && (
              <div>
                <button
                  onClick={stopRecording}
                  className="bg-red-500 hover:bg-red-600 text-white font-bold text-2xl px-16 py-8 rounded-3xl transition-all shadow-xl animate-pulse"
                >
                  🔴 녹음 중... (클릭해서 정지)
                </button>
                <p className="text-lg text-gray-600 mt-6">5초 후 자동으로 정지됩니다</p>
              </div>
            )}

            {testState === 'playing' && (
              <div className="text-center">
                <div className="text-6xl mb-6 animate-pulse">🔊</div>
                <p className="text-3xl font-bold text-blue-600">녹음된 음성을 재생 중...</p>
              </div>
            )}

            {testState === 'success' && (
              <div className="text-center">
                <div className="text-8xl mb-6">✅</div>
                <p className="text-3xl font-bold text-green-600 mb-8">완벽해요! 기기가 정상 작동합니다</p>
                <div className="space-x-4">
                  <button
                    onClick={() => playRecording()}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-4 rounded-xl text-lg"
                  >
                    🔊 다시 듣기
                  </button>
                  <button
                    onClick={resetTest}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold px-8 py-4 rounded-xl text-lg"
                  >
                    🔁 다시 테스트
                  </button>
                </div>
              </div>
            )}

            {testState === 'error' && (
              <div className="text-center">
                <div className="text-8xl mb-6">❗</div>
                <p className="text-3xl font-bold text-red-600 mb-8">음성이 들리지 않아요</p>
                <button
                  onClick={resetTest}
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-12 py-6 rounded-xl text-xl"
                >
                  🔁 다시 테스트하기
                </button>
              </div>
            )}
          </div>

          {/* Waveform 시각화 */}
          {(testState === 'recording' || audioLevel > 0) && (
            <div className="mb-8">
              <h4 className="text-xl font-bold text-gray-900 text-center mb-6">📊 실시간 음성 입력 상태</h4>
              <div className="bg-gray-100 rounded-xl p-6">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={120}
                  className="w-full h-32 rounded-lg"
                />
                <div className="text-center mt-4">
                  <span className="text-lg text-gray-600 font-medium">
                    음성 레벨: {Math.round(audioLevel)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 오류 시 도움말 토글 영역 */}
        {(testState === 'error' || permissionDenied) && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-8 mb-8">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full text-left"
            >
              <h3 className="text-2xl font-bold text-gray-900">❓ 문제가 생겼나요?</h3>
              <span className="text-3xl">{showHelp ? '▼' : '▶'}</span>
            </button>
            
            {showHelp && (
              <div className="mt-8 space-y-6">
                <div className="border-l-4 border-blue-500 pl-6">
                  <h4 className="font-bold text-gray-900 text-lg">🔒 마이크 허용 팝업이 안 떠요</h4>
                  <p className="text-gray-700 mt-2">브라우저 주소창 왼쪽의 🔒 아이콘을 클릭해서 마이크 권한을 허용해주세요.</p>
                </div>
                
                <div className="border-l-4 border-green-500 pl-6">
                  <h4 className="font-bold text-gray-900 text-lg">🔊 내 소리가 안 들려요</h4>
                  <p className="text-gray-700 mt-2">이어폰이나 헤드셋 연결 상태를 확인하거나, 스피커 소리 크기를 확인해주세요.</p>
                </div>
                
                <div className="border-l-4 border-red-500 pl-6">
                  <h4 className="font-bold text-gray-900 text-lg">🆘 여전히 문제가 있어요</h4>
                  <p className="text-gray-700 mt-2">
                    기술 지원이 필요하시면{' '}
                    <a href="mailto:support@example.com" className="text-blue-600 hover:underline font-medium">
                      support@example.com
                    </a>
                    {' '}으로 문의해주세요.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 하단 성공 메시지 */}
        {testState === 'success' && (
          <div className="text-center bg-green-50 border-2 border-green-200 rounded-3xl p-8">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-green-800 mb-4">기기 점검 완료!</h3>
            <p className="text-green-700 text-lg">
              마이크와 스피커가 정상적으로 작동합니다.<br />
              이제 온라인 수업을 시작할 준비가 되었어요!
            </p>
          </div>
        )}

        {/* 푸터 */}
        <footer className="text-center mt-12 text-gray-500">
          <p className="text-sm">
            🔒 개인정보 보호: 녹음된 음성은 브라우저에서만 처리되며 서버로 전송되지 않습니다.
          </p>
        </footer>
      </div>
    </div>
  );
}