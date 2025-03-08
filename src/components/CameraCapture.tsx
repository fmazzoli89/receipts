'use client';

import { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Camera, Upload, Loader2, Save, Edit } from 'lucide-react';
import { processReceipt, type ReceiptData, type ReceiptItem } from '../utils/ocr';
import { appendToSheet } from '../utils/sheets';

export default function CameraCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const capture = useCallback(() => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setImage(imageSrc);
      handleImageProcessing(imageSrc);
    }
  }, [webcamRef]);

  const handleImageProcessing = async (imageSrc: string | null) => {
    if (!imageSrc) return;
    
    setIsProcessing(true);
    try {
      const data = await processReceipt(imageSrc);
      setReceiptData(data);
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Error processing receipt. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!receiptData) return;

    setIsSaving(true);
    try {
      await appendToSheet(receiptData);
      alert('Receipt saved successfully!');
      // Reset the form
      setImage(null);
      setReceiptData(null);
      setIsCapturing(false);
    } catch (error) {
      console.error('Error saving receipt:', error);
      alert('Error saving receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageSrc = reader.result as string;
        setImage(imageSrc);
        handleImageProcessing(imageSrc);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      {!isCapturing && !image && (
        <div className="space-y-4">
          <button
            onClick={() => setIsCapturing(true)}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Camera className="w-5 h-5" />
            Capture Receipt
          </button>
          <div className="relative">
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
      )}

      {isCapturing && !image && (
        <div className="relative">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            className="w-full rounded-lg"
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-4">
            <button
              onClick={() => setIsCapturing(false)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={capture}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              Capture
            </button>
          </div>
        </div>
      )}

      {image && (
        <div className="space-y-4">
          <img src={image} alt="Captured receipt" className="w-full rounded-lg" />
          
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing Receipt...
            </div>
          ) : receiptData ? (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold text-lg mb-2">{receiptData.storeName}</h3>
                <p className="text-sm text-gray-600 mb-4">{receiptData.date}</p>
                
                <div className="space-y-2">
                  {receiptData.items.map((item: ReceiptItem, index: number) => (
                    <div key={index} className="flex justify-between items-center">
                      <span>{item.name}</span>
                      <span>${item.price.toFixed(2)}</span>
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
                    setIsCapturing(false);
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
                setIsCapturing(false);
              }}
              className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
} 