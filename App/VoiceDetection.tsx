import {Button, Text, View} from 'react-native';
import React from 'react';

const VoiceDetection = ({onPressBack}: {onPressBack: () => void}) => {
  return (
    <View>
      <Button title="Back" onPress={onPressBack} />
      <Text>VoiceDetection</Text>
    </View>
  );
};

export default VoiceDetection;
