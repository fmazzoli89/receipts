'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, Loader2, Save, Edit, SwitchCamera, Maximize2, Minimize2 } from 'lucide-react';
import { processReceipt, type ReceiptData, type ReceiptItem } from '@/utils/ocr';
import toast from 'react-hot-toast';

export default function CameraCapture() {
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const optimizeImage = async (imageSrc: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1024;
        
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageSrc;
    });
  };

  const handleImageProcessing = async (imageSrc: string | null) => {
    if (!imageSrc) {
      toast.error('No image data available');
      return;
    }
    
    setIsProcessing(true);
    try {
      const optimizedImage = await optimizeImage(imageSrc);
      const data = await processReceipt(optimizedImage);
      if (!data) {
        throw new Error('No data received from receipt processing');
      }
      setReceiptData(data);
    } catch (error) {
      console.error('Error processing image:', error);
      let errorMessage = 'Error processing receipt. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('too large')) {
          errorMessage = 'Image is too large. Please use a smaller image.';
        } else if (error.message.includes('API key')) {
          errorMessage = 'Server configuration error. Please try again later.';
        } else if (error.message.includes('Failed to load image')) {
          errorMessage = 'Failed to load image. Please try a different image.';
        }
      }
      toast.error(errorMessage);
      setImage(null);
      setReceiptData(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!receiptData) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/sheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || 'Failed to save receipt');
      }

      toast.success('Receipt saved successfully!');
      setImage(null);
      setReceiptData(null);
    } catch (error) {
      console.error('Error saving receipt:', error);
      let errorMessage = 'Error saving receipt. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('storage is not allowed')) {
          errorMessage = 'Storage access error. Please try again in a new tab.';
        } else if (error.message.includes('Google Sheets')) {
          errorMessage = 'Error saving to Google Sheets. Please check your configuration.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Please upload an image smaller than 10MB');
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      toast.error('Error reading file. Please try again.');
    };

    reader.onloadend = () => {
      try {
        const imageSrc = reader.result as string;
        if (!imageSrc || typeof imageSrc !== 'string') {
          throw new Error('Invalid image data');
        }
        setImage(imageSrc);
        handleImageProcessing(imageSrc);
      } catch (error) {
        console.error('Error processing file:', error);
        toast.error('Error processing file. Please try again.');
      }
    };

    try {
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('Error reading file. Please try again.');
    }
  };

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setImage(imageSrc);
        handleImageProcessing(imageSrc);
      } else {
        toast.error('Failed to capture image. Please try again.');
      }
    }
  }, [webcamRef]);

  const openGoogleSheet = () => {
    const sheetId = process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID;
    if (sheetId) {
      window.open(`https://docs.google.com/spreadsheets/d/${sheetId}`, '_blank');
    } else {
      toast.error('Google Sheet ID not configured');
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const toggleImageSize = () => {
    setIsImageExpanded(!isImageExpanded);
    if (!isImageExpanded) {
      toast('Click again to minimize', { icon: '🔍' });
    }
  };

  return (
    <div className="space-y-4">
      {!image && (
        <div className="space-y-4">
          <div className="relative">
            <Webcam
              audio={false}
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              className="w-full rounded-lg"
              videoConstraints={{
                facingMode: facingMode,
              }}
            />
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
              <button
                onClick={capture}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Camera className="w-5 h-5" />
                Capture Receipt
              </button>
              <div className="relative flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="w-full flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                  <Upload className="w-5 h-5" />
                  Upload Receipt
                </button>
              </div>
            </div>
            <button
              onClick={toggleCamera}
              className="absolute top-4 right-4 p-2 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
              aria-label="Switch Camera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={openGoogleSheet}
            className="w-full flex items-center justify-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg hover:bg-green-200 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 3h-15A1.5 1.5 0 003 4.5v15A1.5 1.5 0 004.5 21h15a1.5 1.5 0 001.5-1.5v-15A1.5 1.5 0 0019.5 3zm-1 4h-13v11h13V7zm-11 9v-2h9v2h-9zm0-3v-2h9v2h-9zm0-3V8h9v2h-9z"/>
            </svg>
            Open Google Sheet
          </button>
        </div>
      )}

      {image && (
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className={`relative transition-all duration-300 ${isImageExpanded ? 'w-full' : 'w-24'}`}>
              <img 
                src={image} 
                alt="Captured receipt" 
                className={`rounded-lg cursor-pointer transition-all duration-300 ${isImageExpanded ? 'w-full' : 'w-24 h-24 object-cover'}`}
                onClick={toggleImageSize}
              />
              <button
                onClick={toggleImageSize}
                className="absolute top-2 right-2 p-1.5 bg-gray-800 bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-opacity"
                aria-label={isImageExpanded ? "Minimize image" : "Expand image"}
              >
                {isImageExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
            
            {isProcessing ? (
              <div className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Receipt...
              </div>
            ) : receiptData ? (
              <div className="flex-1 space-y-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <h3 className="font-semibold text-lg mb-2">{receiptData.storeName}</h3>
                  <p className="text-sm text-gray-600 mb-4">{receiptData.datetime}</p>
                  
                  <div className="space-y-2">
                    {receiptData.items.map((item: ReceiptItem, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <div className="flex-1">
                          <span>{item.name}</span>
                          <span className="ml-2 text-sm text-gray-500">({item.category})</span>
                        </div>
                        <span className="ml-4">${item.price.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2 flex justify-between items-center font-semibold">
                      <span>Total</span>
                      <span>${receiptData.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setImage(null);
                      setReceiptData(null);
                      setIsImageExpanded(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <Edit className="w-5 h-5" />
                    Retake
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Save className="w-5 h-5" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setImage(null);
                  setIsImageExpanded(false);
                }}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 