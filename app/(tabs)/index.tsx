import { Image } from 'expo-image';
import {useEffect, useState} from 'react';
import {Platform, StyleSheet, TextInput, Button, TouchableOpacity, ScrollView, View, Text, Share, Alert} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  const [csvData, setCsvData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [headers, setHeaders] = useState([]);
  const [apiResult, setApiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

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
      console.log('Error picking or reading file:', error);
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
      setIsLoading(true);
      setApiResult(null);

      console.log('Sending data to IGRF API...');
      console.log({points_json: csvData.slice(0,1)})
      const response = await fetch('https://igrf-fast-api.onrender.com/pyigrf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({points_json: csvData}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('IGRF computation result:', result);
      setApiResult(result);

    } catch (error) {
      console.log('Error computing IGRF:', error);
      alert('Error computing IGRF: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    console.log('apiResult', apiResult)
  },[apiResult])

  // Function to convert API result to CSV format
  const convertResultToCSV = (result) => {
    // Check if result is an array directly or has a data property
    const dataArray = Array.isArray(result) ? result : (result && result.data ? result.data : null);

    if (!dataArray || dataArray.length === 0) return '';

    // Extract headers from the first result object
    const headers = Object.keys(dataArray[0]);

    // Create CSV header row
    let csvContent = headers.join(',') + '\n';

    // Add data rows
    dataArray.forEach(item => {
      const row = headers.map(header => {
        // Handle values that might contain commas by wrapping in quotes
        const value = item[header] !== undefined ? item[header] : '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',');
      csvContent += row + '\n';
    });

    return csvContent;
  }

  // Function to download/share the CSV file
  const downloadCSV = async () => {
    try {
      if (!apiResult) {
        alert('No results to download');
        return;
      }

      // Convert result to CSV
      const csvContent = convertResultToCSV(apiResult);
      if (!csvContent) {
        alert('Could not convert results to CSV format');
        return;
      }

      // Request permission to access media library
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Sorry, we need media library permissions to save the file');
        return;
      }

      // Create a temporary file in the cache directory (more compatible with MediaLibrary)
      // Ensure proper file path formatting with a unique timestamp to avoid conflicts
      const timestamp = new Date().getTime();
      const fileName = `igrf_results_${timestamp}.csv`;

      // Use FileSystem.documentDirectory as an alternative if available
      const fileUri = (FileSystem.documentDirectory || FileSystem.cacheDirectory) + fileName;

      console.log('Writing file to:', fileUri);

      // Write the file with explicit encoding
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      // Verify file was written successfully
      const fileExists = await FileSystem.getInfoAsync(fileUri);
      console.log('File exists after writing:', fileExists.exists, 'Size:', fileExists.size);

      console.log('CSV Content:', csvContent.substring(0, 100) + '...');

      // Check if file exists before creating asset
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist at path: ' + fileUri);
      }

      console.log('File info:', fileInfo);

      // Skip MediaLibrary on web platform
      if (Platform.OS === 'web') {
        // Web platform doesn't support MediaLibrary, go straight to sharing
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'IGRF Results',
            UTI: 'public.comma-separated-values-text'
          });
        } else {
          // Fallback to Share API if Sharing is not available
          await Share.share({
            url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
            title: 'IGRF Results',
            message: 'IGRF Results CSV file',
            type: 'text/csv',
          });
        }
        return;
      }

      try {
        console.log('Attempting to create asset from:', fileUri);

        // Check if MediaLibrary is available
        if (!MediaLibrary.createAssetAsync) {
          console.log('MediaLibrary.createAssetAsync is not available, falling back to direct sharing');
          throw new Error('MediaLibrary not available');
        }

        // Try to save the file to the device's media library
        const asset = await MediaLibrary.createAssetAsync(fileUri)
          .catch(error => {
            console.log('Error in createAssetAsync:', error);
            throw error;
          });

        if (!asset) {
          throw new Error('Asset creation returned null or undefined');
        }

        console.log('Asset created successfully:', asset);

        // Create an album and add the asset to it (optional)
        const album = await MediaLibrary.getAlbumAsync('IGRF Results');
        if (album === null) {
          await MediaLibrary.createAlbumAsync('IGRF Results', asset, false);
        } else {
          await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        }

        // Show success message
        Alert.alert(
          'File Saved',
          'The CSV file has been saved to your device in the "IGRF Results" album',
          [
            { 
              text: 'OK', 
              style: 'default' 
            },
            {
              text: 'Share',
              onPress: async () => {
                // Share the file using expo-sharing if available
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: 'text/csv',
                    dialogTitle: 'IGRF Results',
                    UTI: 'public.comma-separated-values-text'
                  });
                } else {
                  // Fallback to Share API if Sharing is not available
                  await Share.share({
                    url: Platform.OS === 'ios' ? fileUri : `file://${fileUri}`,
                    title: 'IGRF Results',
                    message: 'IGRF Results CSV file',
                    type: 'text/csv',
                  });
                }
              }
            }
          ]
        );
      } catch (assetError) {
        console.log('Error creating asset:', assetError);

        // Log more details about the error
        if (assetError.code) {
          console.log('Error code:', assetError.code);
        }

        // Try direct sharing as fallback
        console.log('Falling back to direct sharing...');

        // Create a new file in a different location as a fallback
        try {
          // Try to create a new file in a different location
          const fallbackFileName = `igrf_results_fallback_${new Date().getTime()}.csv`;
          const fallbackFileUri = FileSystem.cacheDirectory + fallbackFileName;

          console.log('Creating fallback file at:', fallbackFileUri);
          await FileSystem.writeAsStringAsync(fallbackFileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

          // Verify fallback file was created
          const fallbackFileExists = await FileSystem.getInfoAsync(fallbackFileUri);
          console.log('Fallback file exists:', fallbackFileExists.exists, 'Size:', fallbackFileExists.size);

          if (!fallbackFileExists.exists) {
            throw new Error('Failed to create fallback file');
          }

          // Directly share the fallback file using expo-sharing if available
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fallbackFileUri, {
              mimeType: 'text/csv',
              dialogTitle: 'IGRF Results',
              UTI: 'public.comma-separated-values-text'
            });
          } else {
            // Fallback to Share API if Sharing is not available
            await Share.share({
              url: Platform.OS === 'ios' ? fallbackFileUri : `file://${fallbackFileUri}`,
              title: 'IGRF Results',
              message: 'IGRF Results CSV file',
              type: 'text/csv',
            });
          }
        } catch (shareError) {
          console.log('Error sharing fallback file:', shareError);

          // If direct sharing also fails, show the fallback dialog with content sharing option
          Alert.alert(
            'Save Failed',
            'Could not save or share the file directly. Would you like to try sharing the content instead?',
            [
              { 
                text: 'Cancel', 
                style: 'cancel' 
              },
              {
                text: 'Share Content',
                onPress: async () => {
                  // Share the content directly as text
                  await Share.share({
                    message: csvContent,
                    title: 'IGRF Results CSV Content',
                  });
                }
              }
            ]
          );
        }
      }

    } catch (error) {
      console.log('Error in downloadCSV function:', error);

      // More detailed error logging
      if (error.code) {
        console.log('Error code:', error.code);
      }

      // Try direct content sharing as a last resort
      try {
        console.log('Attempting direct content share as last resort...');

        // Show dialog with options
        Alert.alert(
          'Error Processing File',
          'Could not save or share the file. Would you like to try sharing the content directly?',
          [
            { 
              text: 'Cancel', 
              style: 'cancel' 
            },
            {
              text: 'Share Content',
              onPress: async () => {
                // Share the content directly as text without creating a file
                await Share.share({
                  message: csvContent,
                  title: 'IGRF Results CSV Content',
                });
              }
            },
            {
              text: 'Try File Share',
              onPress: async () => {
                try {
                  // One more attempt with a different file name and location
                  const emergencyFileName = `igrf_emergency_${new Date().getTime()}.csv`;
                  const emergencyFileUri = FileSystem.cacheDirectory + emergencyFileName;

                  console.log('Creating emergency file at:', emergencyFileUri);
                  await FileSystem.writeAsStringAsync(emergencyFileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

                  // Share using expo-sharing if available
                  if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(emergencyFileUri, {
                      mimeType: 'text/csv',
                      dialogTitle: 'IGRF Results',
                      UTI: 'public.comma-separated-values-text'
                    });
                  } else {
                    // Fallback to Share API if Sharing is not available
                    await Share.share({
                      url: Platform.OS === 'ios' ? emergencyFileUri : `file://${emergencyFileUri}`,
                      title: 'IGRF Results',
                      message: 'IGRF Results CSV file',
                      type: 'text/csv',
                    });
                  }
                } catch (emergencyError) {
                  console.log('Emergency share failed:', emergencyError);
                  alert('Could not share file. Please try again later.');
                }
              }
            }
          ]
        );
      } catch (finalError) {
        console.log('Final fallback failed:', finalError);

        // Provide a more user-friendly error message
        let errorMessage = error.message;
        if (errorMessage.includes('Could not create asset')) {
          errorMessage = 'Could not save or share the file. Please check app permissions and try again.';
        }

        alert('Error: ' + errorMessage);
      }
    }
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/OIP.jpeg')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Hi User!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">IGRF Calculator by Garuba Love</ThemedText>
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
            disabled={isLoading || csvData.length === 0}
        >
          <ThemedText style={styles.buttonText}>
            {isLoading ? 'Computing...' : 'Compute'}
          </ThemedText>
        </TouchableOpacity>

        {apiResult && (
          <ThemedView style={styles.resultContainer}>
            <ThemedText type="subtitle">IGRF Computation Results</ThemedText>
            <ThemedText>
              {`Computed ${apiResult.length ? apiResult.length : 0} results`}
            </ThemedText>

            <TouchableOpacity
              style={styles.downloadButton}
              onPress={downloadCSV}
            >
              <ThemedText style={styles.buttonText}>Save Results to Device</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        )}
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Upload file</ThemedText>
        <ThemedText>
          {`Click to upload the csv file of the input data`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Compute</ThemedText>
        <ThemedText>
          {`Click on the compute button to calculate the IGRF coefficients for each point in the csv file. This will take a few seconds.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Download</ThemedText>
        <ThemedText>
          {`Click to download or share the results `}
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
    width: "100%",
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
  downloadButton: {
    backgroundColor: '#4CAF50',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultContainer: {
    marginTop: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderRadius: 5,
    padding: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
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
