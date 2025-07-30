import {useState} from 'react';
import {Button, View} from 'react-native';
import {FaceDetection} from './FaceDetection';
import VoiceDetection from './VoiceDetection';

export function Index() {
  const [activeTab, setActiveTab] = useState<'face' | 'voice' | 'main'>('face');

  return (
    <View>
      {activeTab === 'main' && (
        <View>
          <Button title="Face Detection" onPress={() => setActiveTab('face')} />
          <Button
            title="Voice Detection"
            onPress={() => setActiveTab('voice')}
          />
        </View>
      )}
      {activeTab === 'face' && (
        <FaceDetection onPressBack={() => setActiveTab('main')} />
      )}
      {activeTab === 'voice' && (
        <VoiceDetection onPressBack={() => setActiveTab('main')} />
      )}
    </View>
  );
}
