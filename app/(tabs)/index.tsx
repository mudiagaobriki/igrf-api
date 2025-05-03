import { Image } from 'expo-image';
import { useState } from 'react';
import {Platform, StyleSheet, TextInput, Button, TouchableOpacity, ScrollView, View, Text} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);

  // Function to pick a CSV file
  const pickCSVFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'application/vnd.ms-excel', '.csv'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        console.log('Document picker was canceled');
        return;
      }

      // Get the file URI and name
      const fileUri = result.assets[0].uri;
      const name = result.assets[0].name;
      setFileName(name);

      // Read the file content
      const fileContent = await FileSystem.readAsStringAsync(fileUri);

      // Parse CSV data
      parseCSV(fileContent);
    } catch (error) {
      console.error('Error picking or reading file:', error);
      setFileName('Error: Could not load file. Please try another CSV file.');
    }
  };

  // Function to parse CSV data
  const parseCSV = (csvString) => {
    // Split by lines
    const lines = csvString.split('\n');

    // Extract headers from the first line
    const headerLine = lines[0];
    const extractedHeaders = headerLine.split(',').map(header => header.trim());
    setHeaders(extractedHeaders);

    // Parse data rows as objects with headers as keys
    const dataObjects = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        const values = line.split(',').map(value => value.trim());
        const rowObject = {};

        // Create object with headers as keys and values as values
        extractedHeaders.forEach((header, index) => {
          rowObject[header] = values[index] || '';
        });

        dataObjects.push(rowObject);
      }
    }

    setCsvData(dataObjects);
  };

  const computeIGRF = async () => {
    try {
      console.log('Sending data to IGRF API...');
      console.log({response: JSON.stringify({points_json: csvData.slice(0,5)})})
      const response = await fetch('http://192.168.0.149:8000/pyigrf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({points_json: csvData.slice(0,5)}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('IGRF computation result:', result);

    } catch (error) {
      console.error('Error computing IGRF:', error);
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">CSV File Upload</ThemedText>
        <TouchableOpacity 
          style={styles.uploadButton} 
          onPress={pickCSVFile}
        >
          <ThemedText style={styles.buttonText}>Upload CSV File</ThemedText>
        </TouchableOpacity>

        {fileName ? (
          <ThemedText>Selected file: {fileName}</ThemedText>
        ) : null}

        {csvData.length > 0 && (
          <ThemedView style={styles.csvDataContainer}>
            <ThemedText type="subtitle">CSV Data</ThemedText>

            {/* Headers Row */}
            <ThemedView style={styles.csvRow}>
              <ThemedText style={styles.csvRowTitle}>Headers (Object Keys):</ThemedText>
              <ThemedText>{headers.join(', ')}</ThemedText>
            </ThemedView>

            {/* First Data Row */}
            {csvData.length > 0 && (
              <ThemedView style={styles.csvRow}>
                <ThemedText style={styles.csvRowTitle}>First Object:</ThemedText>
                <ThemedText>
                  {JSON.stringify(csvData[0], null, 2)}
                </ThemedText>
              </ThemedView>
            )}

            {/* Second Data Row */}
            {csvData.length > 1 && (
              <ThemedView style={styles.csvRow}>
                <ThemedText style={styles.csvRowTitle}>Second Object:</ThemedText>
                <ThemedText>
                  {JSON.stringify(csvData[1], null, 2)}
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}

        <TouchableOpacity
            style={styles.uploadButton}
            onPress={computeIGRF}
        >
          <ThemedText style={styles.buttonText}>Compute</ThemedText>
        </TouchableOpacity>

        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  csvDataContainer: {
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
  },
  csvRow: {
    marginVertical: 5,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  csvRowTitle: {
    fontWeight: 'bold',
    marginBottom: 3,
  },
  // Keeping these styles for backward compatibility
  tableContainer: {
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  tableCell: {
    padding: 10,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  headerText: {
    fontWeight: 'bold',
  },
});
