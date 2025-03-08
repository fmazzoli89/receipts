import CameraCapture from '@/components/CameraCapture';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <h1 className="text-4xl font-bold mb-8 text-gray-800">Receipt Scanner</h1>
      <div className="w-full max-w-md">
        <CameraCapture />
      </div>
    </div>
  );
} 