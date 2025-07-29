import React from 'react';
import {
  StyleSheet,
  Text,
  Button,
  View,
  useWindowDimensions,
  Alert,
} from 'react-native';
import {
  CameraPosition,
  DrawableFrame,
  Frame,
  Camera as VisionCamera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import {useAppState} from '@react-native-community/hooks';
import {
  Camera,
  Face,
  FaceDetectionOptions,
} from 'react-native-vision-camera-face-detector';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

/**
 * Entry point component
 */
function Index() {
  return <FaceDetection />;
}

/**
 * Face detection component
 */
function FaceDetection() {
  const {width, height} = useWindowDimensions();
  const {hasPermission, requestPermission} = useCameraPermission();
  const [cameraMounted, setCameraMounted] = React.useState<boolean>(false);
  const [cameraPaused, setCameraPaused] = React.useState<boolean>(false);
  const [autoMode, setAutoMode] = React.useState<boolean>(true);
  const [cameraFacing, setCameraFacing] =
    React.useState<CameraPosition>('front');

  // Polygon detection states
  const [polygonColor, setPolygonColor] = useState<'red' | 'green'>('red');
  const [faceInsidePolygon, setFaceInsidePolygon] = React.useState(false);
  const [detectedFaces, setDetectedFaces] = React.useState<Face[]>([]);

  // Timer states for 5-second event
  const [timeLeft, setTimeLeft] = React.useState(5);
  const [isTimerActive, setIsTimerActive] = React.useState(false);
  const [eventTriggered, setEventTriggered] = React.useState(false);

  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const faceDetectionOptions = React.useRef<FaceDetectionOptions>({
    performanceMode: 'fast',
    classificationMode: 'all',
    contourMode: 'all',
    landmarkMode: 'all',
    windowWidth: width,
    windowHeight: height,
  }).current;
  const isFocused = true;
  const appState = useAppState();
  const isCameraActive = !cameraPaused && isFocused && appState === 'active';
  const cameraDevice = useCameraDevice(cameraFacing);
  //
  // vision camera ref
  //
  const camera = React.useRef<VisionCamera>(null);
  //
  // face rectangle position
  //
  const aFaceW = useSharedValue(0);
  const aFaceH = useSharedValue(0);
  const aFaceX = useSharedValue(0);
  const aFaceY = useSharedValue(0);
  const aRot = useSharedValue(0);

  const polygonBounds = {
    centerX: 0.5, // 50% from left
    centerY: 0.4, // 40% from top (moved up slightly)
    width: 0.7, // 70% of screen width (large size)
    height: 0.5, // 50% of screen height (large size)
  };

  const isFaceInsidePolygonArea = (face: Face) => {
    const polygonLeft = polygonBounds.centerX - polygonBounds.width / 2;
    const polygonRight = polygonBounds.centerX + polygonBounds.width / 2;
    const polygonTop = polygonBounds.centerY - polygonBounds.height / 2;
    const polygonBottom = polygonBounds.centerY + polygonBounds.height / 2;

    const faceLeft = face.bounds.x / width;
    const faceRight = (face.bounds.x + face.bounds.width) / width;
    const faceTop = face.bounds.y / height;
    const faceBottom = (face.bounds.y + face.bounds.height) / height;

    // Calculate overlap area for strict detection
    const overlapLeft = Math.max(faceLeft, polygonLeft);
    const overlapRight = Math.min(faceRight, polygonRight);
    const overlapTop = Math.max(faceTop, polygonTop);
    const overlapBottom = Math.min(faceBottom, polygonBottom);

    // Check if there's significant overlap (at least 75% of face is inside)
    const overlapWidth = Math.max(0, overlapRight - overlapLeft);
    const overlapHeight = Math.max(0, overlapBottom - overlapTop);
    const overlapArea = overlapWidth * overlapHeight;

    const faceWidth = faceRight - faceLeft;
    const faceHeight = faceBottom - faceTop;
    const faceArea = faceWidth * faceHeight;

    const overlapPercentage = faceArea > 0 ? overlapArea / faceArea : 0;

    // Face is considered "inside" when at least 75% of the face overlaps
    // This allows better flexibility for vertical movement while preventing half-face detection
    return overlapPercentage >= 0.75;
  };

  // Reset detection
  const resetDetection = () => {
    setFaceInsidePolygon(false);
    setPolygonColor('red');
    setDetectedFaces([]);
    setIsTimerActive(false);
    setTimeLeft(5);
    setEventTriggered(false);
  };

  useEffect(() => {
    if (hasPermission) return;
    requestPermission();
  }, [hasPermission, requestPermission]);

  // Timer effect for 5-second event
  React.useEffect(() => {
    const triggerEvent = () => {
      setEventTriggered(true);
      setIsTimerActive(false);
      Alert.alert(
        'Success!',
        'Face detected inside polygon for 5 seconds! Event triggered.',
        [
          {
            text: 'OK',
            onPress: () => {
              resetDetection();
            },
          },
        ],
      );
    };

    if (isTimerActive && timeLeft > 0 && faceInsidePolygon) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && faceInsidePolygon && !eventTriggered) {
      triggerEvent();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeLeft, faceInsidePolygon, eventTriggered]);

  /**
   * Handle camera UI rotation
   *
   * @param {number} rotation Camera rotation
   */
  function handleUiRotation(rotation: number) {
    aRot.value = rotation;
  }

  /**
   * Hanldes camera mount error event
   *
   * @param {any} error Error event
   */
  function handleCameraMountError(error: any) {
    console.error('camera mount error', error);
  }

  /**
   * Handle detection result
   *
   * @param {Face[]} faces Detection result
   * @param {Frame} frame Current frame
   * @returns {void}
   */
  function handleFacesDetected(faces: Face[], frame: Frame): void {
    setDetectedFaces(faces);

    // if no faces are detected we do nothing
    if (faces.length <= 0) {
      aFaceW.value = 0;
      aFaceH.value = 0;
      aFaceX.value = 0;
      aFaceY.value = 0;
      setFaceInsidePolygon(false);
      setPolygonColor('red');
      return;
    }

    const {bounds} = faces[0];
    const {width, height, x, y} = bounds;
    aFaceW.value = width;
    aFaceH.value = height;
    aFaceX.value = x;
    aFaceY.value = y;

    // Check if the face is positioned correctly inside the polygon
    const faceInside = faces.some(face => isFaceInsidePolygonArea(face));

    if (faceInside) {
      setFaceInsidePolygon(true);
      setPolygonColor('green');

      // Start timer if not already active and event not triggered
      if (!isTimerActive && !eventTriggered) {
        setIsTimerActive(true);
        setTimeLeft(5);
      }
    } else {
      setFaceInsidePolygon(false);
      setPolygonColor('red');

      // Stop timer when face moves outside
      setIsTimerActive(false);
      setTimeLeft(5);
    }

    // only call camera methods if ref is defined
    if (camera.current) {
      // take photo, capture video, etc...
    }
  }

  return (
    <>
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}>
        {hasPermission && cameraDevice ? (
          <>
            {cameraMounted && (
              <>
                <Camera
                  // @ts-ignore
                  ref={camera}
                  style={StyleSheet.absoluteFill}
                  isActive={isCameraActive}
                  device={cameraDevice}
                  onError={handleCameraMountError}
                  faceDetectionCallback={handleFacesDetected}
                  onUIRotationChanged={handleUiRotation}
                  // @ts-ignore
                  faceDetectionOptions={{
                    ...faceDetectionOptions,
                    autoMode,
                    cameraFacing,
                  }}
                />

                {/* Polygon Shape */}
                <View style={styles.polygonContainer}>
                  <View style={[styles.polygon, {borderColor: polygonColor}]}>
                    {/* Polygon corners */}
                    <View
                      style={[
                        styles.corner,
                        styles.topLeft,
                        {borderColor: polygonColor},
                      ]}
                    />
                    <View
                      style={[
                        styles.corner,
                        styles.topRight,
                        {borderColor: polygonColor},
                      ]}
                    />
                    <View
                      style={[
                        styles.corner,
                        styles.bottomLeft,
                        {borderColor: polygonColor},
                      ]}
                    />
                    <View
                      style={[
                        styles.corner,
                        styles.bottomRight,
                        {borderColor: polygonColor},
                      ]}
                    />
                  </View>
                </View>

                {/* Status Text */}
                <View style={styles.statusContainer}>
                  <Text style={styles.statusText}>
                    {eventTriggered
                      ? 'Event Triggered! ✅'
                      : isTimerActive
                      ? `Face inside! Time left: ${timeLeft}s ⏱️`
                      : faceInsidePolygon
                      ? 'Face positioned correctly in polygon! ✅'
                      : detectedFaces.length > 0
                      ? `Face detected (${detectedFaces.length}) - move inside polygon 📍`
                      : 'Position your face inside the polygon 📍'}
                  </Text>
                </View>

                {cameraPaused && (
                  <Text
                    style={{
                      width: '100%',
                      backgroundColor: 'rgb(0,0,255)',
                      textAlign: 'center',
                      color: 'white',
                    }}>
                    Camera is PAUSED
                  </Text>
                )}
              </>
            )}

            {!cameraMounted && (
              <Text
                style={{
                  width: '100%',
                  backgroundColor: 'rgb(255,255,0)',
                  textAlign: 'center',
                }}>
                Camera is NOT mounted
              </Text>
            )}
          </>
        ) : (
          <Text
            style={{
              width: '100%',
              backgroundColor: 'rgb(255,0,0)',
              textAlign: 'center',
              color: 'white',
            }}>
            No camera device or permission
          </Text>
        )}
      </View>

      <View
        style={{
          position: 'absolute',
          bottom: 20,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
        }}>
        <View
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-around',
          }}>
          <Button
            onPress={() =>
              setCameraFacing((current: CameraPosition) =>
                current === 'front' ? 'back' : 'front',
              )
            }
            title={'Toggle Cam'}
          />

          <Button
            onPress={() => setAutoMode((current: boolean) => !current)}
            title={`${autoMode ? 'Disable' : 'Enable'} AutoMode`}
          />

          <Button onPress={resetDetection} title="Reset" />
        </View>
        <View
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-around',
          }}>
          <Button
            onPress={() => setCameraPaused((current: boolean) => !current)}
            title={`${cameraPaused ? 'Resume' : 'Pause'} Cam`}
          />

          <Button
            onPress={() => setCameraMounted((current: boolean) => !current)}
            title={`${cameraMounted ? 'Unmount' : 'Mount'} Cam`}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  polygonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  polygon: {
    width: '70%', // Large polygon - 70% of screen width
    height: '50%', // Large polygon - 50% of screen height
    borderWidth: 4,
    borderStyle: 'solid',
    borderRadius: 20,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20, // Slightly larger corners for better visibility
    height: 20,
    borderWidth: 4,
    borderRadius: 3,
  },
  topLeft: {
    top: -10,
    left: -10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: -10,
    right: -10,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: -10,
    left: -10,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: -10,
    right: -10,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  statusContainer: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 10,
    padding: 15,
    pointerEvents: 'none',
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default Index;
