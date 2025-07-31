/* eslint-disable react-native/no-inline-styles */
import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  Button,
  View,
  Text,
  Alert,
  StyleSheet,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import AudioRecorderPlayer, {
  RecordBackType,
} from 'react-native-audio-recorder-player';

// Constants
const TIMER_DURATION = 30;
const LOW_SOUND_THRESHOLD = 3000; // 3 seconds
const ANIMATION_DURATION = 400;
const CIRCLE_DELAYS = {
  CIRCLE_1: 0,
  CIRCLE_2: 50,
  CIRCLE_3: 100,
};

// Sound level thresholds for circle detection
const SOUND_LEVELS = {
  CIRCLE_1: {min: -160, max: -26},
  CIRCLE_2: {min: -25, max: -17},
  CIRCLE_3: {min: -16, max: 0},
};

export const VoiceDetection = ({onPressBack}: {onPressBack: () => void}) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(TIMER_DURATION);
  const [testStatus, setTestStatus] = useState('');
  const [soundLevel, setSoundLevel] = useState(0);
  const [hasShownLowSoundAlert, setHasShownLowSoundAlert] = useState(false);
  const [lowSoundStartTime, setLowSoundStartTime] = useState<number | null>(
    null,
  );
  const [hasShownLoudSoundAlert, setHasShownLoudSoundAlert] = useState(false);

  // Refs for timers and animation tracking
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const soundCheckTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentCircleCountRef = useRef(0);

  // Animation tracking refs
  const circle1Running = useRef(false);
  const circle2Running = useRef(false);
  const circle3Running = useRef(false);

  // Reanimated shared values for circles
  const circle1Anim = useSharedValue(0.5);
  const circle2Anim = useSharedValue(0.5);
  const circle3Anim = useSharedValue(0.5);

  // Test function to manually show circles
  const testCircles = () => {
    console.log('Testing circles...');
    circle1Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
    setTimeout(
      () => (circle2Anim.value = withTiming(1, {duration: ANIMATION_DURATION})),
      500,
    );
    setTimeout(
      () => (circle3Anim.value = withTiming(1, {duration: ANIMATION_DURATION})),
      1000,
    );
  };

  // Helper functions
  const requestMicrophonePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message:
              'This app needs access to your microphone to detect voice.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.log('err', err);
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Determine number of circles based on sound level
  const getCircleCount = (level: number) => {
    if (
      level >= SOUND_LEVELS.CIRCLE_1.min &&
      level <= SOUND_LEVELS.CIRCLE_1.max
    )
      return 1;
    if (
      level >= SOUND_LEVELS.CIRCLE_2.min &&
      level <= SOUND_LEVELS.CIRCLE_2.max
    )
      return 2;
    if (
      level >= SOUND_LEVELS.CIRCLE_3.min &&
      level <= SOUND_LEVELS.CIRCLE_3.max
    )
      return 3;
    return 0;
  };

  // Animate circles with fade in/out effects
  const animateCircles = useCallback(
    (circleCount: number) => {
      console.log('Animating circles for count:', circleCount);

      // Handle circle 1
      if (circleCount >= 1) {
        if (!circle1Running.current) {
          console.log('Starting circle 1');
          circle1Running.current = true;
          circle1Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
        }
      } else {
        if (circle1Running.current) {
          console.log('Stopping circle 1');
          circle1Running.current = false;
          circle1Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
        }
      }

      // Handle circle 2 - ensure it appears for both level 2 and 3
      if (circleCount >= 2) {
        if (!circle2Running.current) {
          console.log('Starting circle 2');
          circle2Running.current = true;
          setTimeout(() => {
            circle2Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
          }, CIRCLE_DELAYS.CIRCLE_2);
        }
      } else {
        if (circle2Running.current) {
          console.log('Stopping circle 2');
          circle2Running.current = false;
          circle2Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
        }
      }

      // Handle circle 3
      if (circleCount >= 3) {
        if (!circle3Running.current) {
          console.log('Starting circle 3');
          circle3Running.current = true;
          setTimeout(() => {
            circle3Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
          }, CIRCLE_DELAYS.CIRCLE_3);
        }
      } else {
        if (circle3Running.current) {
          console.log('Stopping circle 3');
          circle3Running.current = false;
          circle3Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
        }
      }
    },
    [circle1Anim, circle2Anim, circle3Anim],
  );

  // Animated styles for circles
  const circle1Style = useAnimatedStyle(() => {
    const opacity = circle1Anim.value;
    console.log('Circle 1 opacity:', opacity);
    return {
      opacity: opacity,
    };
  });

  const circle2Style = useAnimatedStyle(() => {
    const opacity = circle2Anim.value;
    console.log('Circle 2 opacity:', opacity);
    return {
      opacity: opacity,
    };
  });

  const circle3Style = useAnimatedStyle(() => {
    const opacity = circle3Anim.value;
    console.log('Circle 3 opacity:', opacity);
    return {
      opacity: opacity,
    };
  });

  // Stop voice test function
  const stopVoiceTest = useCallback(async () => {
    // Clear timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (soundCheckTimerRef.current) {
      clearTimeout(soundCheckTimerRef.current);
      soundCheckTimerRef.current = null;
    }

    // Stop recording
    await stopAudioRecording();

    // Reset state
    setIsListening(false);
    setTimeRemaining(TIMER_DURATION);
    setSoundLevel(0);
    setTestStatus('');
    currentCircleCountRef.current = 0;

    // Reset animation tracking
    circle1Running.current = false;
    circle2Running.current = false;
    circle3Running.current = false;

    // Reset alert states
    setHasShownLowSoundAlert(false);
    setLowSoundStartTime(null);
    setHasShownLoudSoundAlert(false);

    // Fade out all circles
    circle1Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
    circle2Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
    circle3Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
  }, [circle1Anim, circle2Anim, circle3Anim]);

  // Timer management
  const handleTimerCompletion = useCallback(() => {
    // Stop the test when timer reaches 0
    stopVoiceTest();
    Alert.alert(
      'Voice Test Complete',
      'The 30-second voice detection test has finished. Thank you for participating!',
      [{text: 'OK'}],
    );
  }, [stopVoiceTest]);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleTimerCompletion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleTimerCompletion]);

  // Audio level monitoring
  useEffect(() => {
    AudioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
      console.log('Recording progress:', e.currentPosition, e.currentMetering);
      const level = e.currentMetering || 0;
      setSoundLevel(level);

      if (!isListening) return;

      const circleCount = getCircleCount(level);

      // Update circles when count changes
      if (circleCount !== currentCircleCountRef.current) {
        currentCircleCountRef.current = circleCount;
        animateCircles(circleCount);

        // Reset low sound tracking when circle count changes
        if (circleCount !== 1) {
          setLowSoundStartTime(null);
          setHasShownLowSoundAlert(false);
        }
      }

      // Ensure all circles up to the current count are visible
      if (circleCount >= 1 && circle1Anim.value === 0) {
        circle1Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
      }
      if (circleCount >= 2 && circle2Anim.value === 0) {
        setTimeout(() => {
          circle2Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
        }, CIRCLE_DELAYS.CIRCLE_2);
      }
      if (circleCount >= 3 && circle3Anim.value === 0) {
        setTimeout(() => {
          circle3Anim.value = withTiming(1, {duration: ANIMATION_DURATION});
        }, CIRCLE_DELAYS.CIRCLE_3);
      }

      // Hide circles that should not be visible
      if (circleCount < 1 && circle1Anim.value > 0) {
        circle1Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
      }
      if (circleCount < 2 && circle2Anim.value > 0) {
        circle2Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
      }
      if (circleCount < 3 && circle3Anim.value > 0) {
        circle3Anim.value = withTiming(0, {duration: ANIMATION_DURATION});
      }

      // Handle low sound detection (1 circle for 3+ seconds)
      if (circleCount === 1 && !hasShownLowSoundAlert) {
        const currentTime = Date.now();
        if (lowSoundStartTime === null) {
          setLowSoundStartTime(currentTime);
        } else if (currentTime - lowSoundStartTime >= LOW_SOUND_THRESHOLD) {
          setHasShownLowSoundAlert(true);
          Alert.alert(
            'Low Sound Level Detected',
            'Sound level has been low for 3 seconds. Timer extended to 30 seconds. Please speak louder.',
            [{text: 'OK'}],
          );

          // Extend timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setTimeRemaining(TIMER_DURATION);
          startTimer();
        }
      }
    });
  }, [
    isListening,
    animateCircles,
    hasShownLowSoundAlert,
    lowSoundStartTime,
    hasShownLoudSoundAlert,
    stopVoiceTest,
    circle1Anim,
    circle2Anim,
    circle3Anim,
    startTimer,
  ]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (soundCheckTimerRef.current) {
        clearTimeout(soundCheckTimerRef.current);
      }
    };
  }, []);

  // Audio recording functions
  const startAudioDetection = async () => {
    try {
      const result = await AudioRecorderPlayer.startRecorder(
        undefined,
        undefined,
        true,
      );
      console.log('Recording started:', result);
    } catch (error) {
      console.log('error', error);
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start audio recording');
    }
  };

  const stopAudioRecording = async () => {
    const result = await AudioRecorderPlayer.stopRecorder();
    AudioRecorderPlayer.removeRecordBackListener();
    console.log('Recording stopped:', result);
  };

  const startVoiceTest = async () => {
    const hasPermission = await requestMicrophonePermission();
    if (!hasPermission) {
      Alert.alert(
        'Permission Denied',
        'Microphone permission is required for voice detection.',
      );
      return;
    }

    // Initialize test state
    setIsListening(true);
    setTimeRemaining(TIMER_DURATION);
    setSoundLevel(0);
    setTestStatus('Listening...');
    currentCircleCountRef.current = 0;

    // Reset all tracking states
    setHasShownLowSoundAlert(false);
    setLowSoundStartTime(null);
    setHasShownLoudSoundAlert(false);

    // Reset animation states
    circle1Running.current = false;
    circle2Running.current = false;
    circle3Running.current = false;

    // Reset animation values
    circle1Anim.value = 0;
    circle2Anim.value = 0;
    circle3Anim.value = 0;

    // Start timer and audio detection
    startTimer();

    setTimeout(() => {
      startAudioDetection();
    }, 50);
  };

  const circleCount = getCircleCount(soundLevel);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Voice Detection Test</Text>

        {/* Circle Wave Animation */}
        {isListening && (
          <View style={styles.animationContainer}>
            <Animated.View
              style={[styles.circle, styles.circle1, circle1Style]}
            />
            <Animated.View
              style={[styles.circle, styles.circle2, circle2Style]}
            />
            <Animated.View
              style={[styles.circle, styles.circle3, circle3Style]}
            />
          </View>
        )}

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isListening
              ? `Time Remaining: ${timeRemaining}s`
              : 'Ready to test'}
          </Text>
          <Text style={styles.statusText}>{testStatus}</Text>
          {isListening && (
            <>
              <Text style={styles.soundLevelText}>
                Sound Level: {soundLevel.toFixed(2)}
              </Text>
              <Text style={styles.circleCountText}>
                Active Circles: {circleCount}
              </Text>
            </>
          )}
        </View>

        <View style={styles.buttonContainer}>
          {!isListening ? (
            <>
              <Button
                title="Start Voice Test"
                onPress={startVoiceTest}
                color="#4CAF50"
              />
              <Button
                title="Test Circles"
                onPress={testCircles}
                color="#FF9800"
              />
            </>
          ) : (
            <Button title="Stop Test" onPress={stopVoiceTest} color="#f44336" />
          )}
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            • Test will run for 30 seconds{'\n'}• Speak clearly during the test
            {'\n'}• Alert will show if no sound after 3 seconds{'\n'}• Success
            message if sound detected{'\n'}• Real-time sound level monitoring
            {'\n'}• Circle waves show sound intensity:
            {'\n'} - 1 circle: -160 to -26 dB
            {'\n'} - 2 circles: -25 to -17 dB
            {'\n'} - 3 circles: -16 to 0 dB
          </Text>
        </View>
      </View>

      <View style={styles.bottomContainer}>
        <Button onPress={onPressBack} title="Back" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#ffffff',
  },
  animationContainer: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  circle: {
    position: 'absolute',
    borderWidth: 3,
  },
  circle1: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderColor: '#00ff88',
    backgroundColor: 'rgba(0, 255, 136, 0.2)',
  },
  circle2: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderColor: '#00bfff',
    backgroundColor: 'rgba(0, 191, 255, 0.15)',
  },
  circle3: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderColor: '#ff6b35',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  statusText: {
    fontSize: 18,
    marginBottom: 10,
    color: '#cccccc',
    textAlign: 'center',
  },
  soundLevelText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  circleCountText: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: 'bold',
    marginTop: 5,
  },
  buttonContainer: {
    marginBottom: 30,
    minWidth: 200,
  },
  instructions: {
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  instructionText: {
    fontSize: 16,
    color: '#e0e0e0',
    lineHeight: 24,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
});
