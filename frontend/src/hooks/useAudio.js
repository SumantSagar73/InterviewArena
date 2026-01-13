
import { useState, useRef, useCallback } from "react";
import { audioApi } from "../api/audio";
import toast from "react-hot-toast";

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            toast.error("Could not access microphone");
        }
    }, []);

    const stopRecording = useCallback(() => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) return resolve(null);

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                chunksRef.current = [];
                setIsRecording(false);

                // Stop all tracks to release mic
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                resolve(blob);
            };

            mediaRecorderRef.current.stop();
        });
    }, []);

    return { isRecording, startRecording, stopRecording };
};

export const useTextToSpeech = (onEnded) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef(null);

    const speak = useCallback(async (text) => {
        if (!text) return;

        try {
            const arrayBuffer = await audioApi.speak(text);

            if (arrayBuffer.byteLength === 0) {
                console.error("Received empty audio buffer");
                return;
            }

            const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
            const url = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }

            const audio = new Audio(url);
            audioRef.current = audio;

            audio.onended = () => {
                setIsPlaying(false);
                URL.revokeObjectURL(url);
                if (onEnded) onEnded();
            };

            audio.onerror = (e) => {
                console.error("Audio playback error:", e);
                setIsPlaying(false);
                toast.error("Error playing audio");
            };

            setIsPlaying(true);
            const playPromise = audio.play();

            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.error("Play prevented by browser:", error);
                    setIsPlaying(false);
                });
            }

        } catch (error) {
            console.error("TTS Error in useAudio:", error);
            setIsPlaying(false);
        }
    }, [onEnded]);

    const stop = useCallback(() => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    }, []);

    return { isPlaying, speak, stop };
};

/**
 * Hook for Live Speech-to-Text using Web Speech API
 * Provides real-time interim results and detects final transcripts.
 */
export const useSpeechToText = (onFinalTranscript) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState("");
    const [interimTranscript, setInterimTranscript] = useState("");
    const recognitionRef = useRef(null);
    const shouldBeListeningRef = useRef(false);

    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast.error("Web Speech API is not supported in this browser.");
            return;
        }

        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (e) { }
        }

        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onstart = () => {
            setIsListening(true);
            shouldBeListeningRef.current = true;
        };

        recognition.onend = () => {
            // If it stopped but we should still be listening, restart it with a small delay
            if (shouldBeListeningRef.current) {
                setTimeout(() => {
                    if (shouldBeListeningRef.current) {
                        try {
                            recognition.start();
                        } catch (e) {
                            console.error("Failed to restart recognition:", e);
                            setIsListening(false);
                            shouldBeListeningRef.current = false;
                        }
                    }
                }, 200);
            } else {
                setIsListening(false);
            }
        };

        recognition.onerror = (event) => {
            console.error("Speech Recognition Error:", event.error);

            // Silence common non-critical errors
            if (event.error === "no-speech") return;
            if (event.error === "aborted") return;

            if (event.error === "not-allowed") {
                toast.error("Microphone access denied. Please allow it in browser settings.");
                shouldBeListeningRef.current = false;
            } else {
                toast.error(`Mic Error: ${event.error}`);
            }
        };

        recognition.onresult = (event) => {
            let interimText = "";
            let finalText = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    finalText += result[0].transcript;
                } else {
                    interimText += result[0].transcript;
                }
            }

            if (finalText) {
                setTranscript((prev) => prev + (prev ? " " : "") + finalText);
                if (onFinalTranscript) onFinalTranscript(finalText);
            }
            setInterimTranscript(interimText);
        };

        try {
            recognition.start();
        } catch (e) {
            console.error("Start error:", e);
        }
    }, [onFinalTranscript]);

    const stopListening = useCallback(() => {
        shouldBeListeningRef.current = false;
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    const resetTranscript = useCallback(() => {
        setTranscript("");
        setInterimTranscript("");
    }, []);

    return {
        isListening,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript
    };
};
