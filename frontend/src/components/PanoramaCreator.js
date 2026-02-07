import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/dialog';
import {
  Camera,
  RotateCcw,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  Smartphone,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import imageCompression from 'browser-image-compression';

// 360 derece fotoğraf için çekim noktaları (8 yön)
const CAPTURE_POINTS = [
  { angle: 0, label: 'Ön', direction: 'Karşınıza bakın', icon: '⬆️' },
  { angle: 45, label: 'Ön-Sağ', direction: '45° sağa dönün', icon: '↗️' },
  { angle: 90, label: 'Sağ', direction: '90° sağa dönün', icon: '➡️' },
  { angle: 135, label: 'Arka-Sağ', direction: '135° sağa dönün', icon: '↘️' },
  { angle: 180, label: 'Arka', direction: 'Arkanıza dönün', icon: '⬇️' },
  { angle: 225, label: 'Arka-Sol', direction: '225° dönün', icon: '↙️' },
  { angle: 270, label: 'Sol', direction: 'Sola dönün', icon: '⬅️' },
  { angle: 315, label: 'Ön-Sol', direction: '315° dönün', icon: '↖️' },
];

// Fotoğraf sıkıştırma
const compressImage = async (file) => {
  const options = {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.9,
  };
  
  try {
    return await imageCompression(file, options);
  } catch (error) {
    console.error('Sıkıştırma hatası:', error);
    return file;
  }
};

export default function PanoramaCreator({ 
  isOpen, 
  onClose, 
  onComplete,
  roomName = 'Oda'
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [capturedPhotos, setCapturedPhotos] = useState(Array(8).fill(null));
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Kamera başlat
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStream(stream);
    } catch (error) {
      console.error('Kamera hatası:', error);
      setCameraError('Kamera erişimi sağlanamadı. Lütfen tarayıcı izinlerini kontrol edin veya dosyadan yükleyin.');
    }
  }, []);

  // Kamera durdur
  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  }, [cameraStream]);

  // Dialog açıldığında kamera başlat
  useEffect(() => {
    if (isOpen && !showInstructions) {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, showInstructions, startCamera, stopCamera]);

  // Fotoğraf çek
  const capturePhoto = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
      const file = new File([blob], `photo_${currentStep}.jpg`, { type: 'image/jpeg' });
      const compressed = await compressImage(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhotos = [...capturedPhotos];
        newPhotos[currentStep] = reader.result;
        setCapturedPhotos(newPhotos);
        
        // Sonraki adıma geç
        if (currentStep < 7) {
          setCurrentStep(currentStep + 1);
          toast.success(`${CAPTURE_POINTS[currentStep].label} tamamlandı!`);
        } else {
          toast.success('Tüm fotoğraflar çekildi!');
          setPreviewMode(true);
        }
      };
      reader.readAsDataURL(compressed);
    } catch (error) {
      toast.error('Fotoğraf çekilemedi');
    } finally {
      setIsCapturing(false);
    }
  }, [currentStep, capturedPhotos]);

  // Dosyadan yükle
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dosya 10MB\'dan küçük olmalı');
      return;
    }
    
    setIsCapturing(true);
    
    try {
      const compressed = await compressImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const newPhotos = [...capturedPhotos];
        newPhotos[currentStep] = reader.result;
        setCapturedPhotos(newPhotos);
        
        if (currentStep < 7) {
          setCurrentStep(currentStep + 1);
          toast.success(`${CAPTURE_POINTS[currentStep].label} yüklendi!`);
        } else {
          toast.success('Tüm fotoğraflar yüklendi!');
          setPreviewMode(true);
        }
      };
      reader.readAsDataURL(compressed);
    } catch (error) {
      toast.error('Dosya yüklenemedi');
    } finally {
      setIsCapturing(false);
    }
  }, [currentStep, capturedPhotos]);

  // Panorama oluştur
  const createPanorama = useCallback(async () => {
    const filledPhotos = capturedPhotos.filter(p => p !== null);
    if (filledPhotos.length < 4) {
      toast.error('En az 4 fotoğraf gerekli');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Basit yatay birleştirme - canvas ile
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Her fotoğrafın boyutunu belirle
      const singleWidth = 1024;
      const singleHeight = 512;
      
      // Panorama boyutu (8 fotoğraf yan yana)
      canvas.width = singleWidth * capturedPhotos.filter(p => p).length;
      canvas.height = singleHeight;
      
      // Fotoğrafları yükle ve çiz
      let xOffset = 0;
      for (let i = 0; i < capturedPhotos.length; i++) {
        if (capturedPhotos[i]) {
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = capturedPhotos[i];
          });
          
          ctx.drawImage(img, xOffset, 0, singleWidth, singleHeight);
          xOffset += singleWidth;
        }
      }
      
      // Canvas'ı base64'e çevir
      const panoramaBase64 = canvas.toDataURL('image/jpeg', 0.85);
      
      toast.success('360° görünüm oluşturuldu!');
      onComplete(panoramaBase64);
      handleClose();
    } catch (error) {
      console.error('Panorama oluşturma hatası:', error);
      toast.error('Panorama oluşturulamadı');
    } finally {
      setIsProcessing(false);
    }
  }, [capturedPhotos, onComplete]);

  // Sıfırla
  const resetCapture = () => {
    setCapturedPhotos(Array(8).fill(null));
    setCurrentStep(0);
    setPreviewMode(false);
  };

  // Kapat
  const handleClose = () => {
    stopCamera();
    resetCapture();
    setShowInstructions(true);
    onClose();
  };

  // Belirli bir fotoğrafı yeniden çek
  const retakePhoto = (index) => {
    setCurrentStep(index);
    setPreviewMode(false);
  };

  const completedCount = capturedPhotos.filter(p => p !== null).length;
  const progress = (completedCount / 8) * 100;
  const currentPoint = CAPTURE_POINTS[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            360° Fotoğraf Oluştur - {roomName}
          </DialogTitle>
          <DialogDescription>
            Odanın farklı açılarından fotoğraf çekerek basit bir 360° görünüm oluşturun
          </DialogDescription>
        </DialogHeader>

        {/* Talimatlar */}
        {showInstructions && (
          <div className="space-y-4 py-4">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  Nasıl Çalışır?
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                  <li>Odanın ortasında sabit bir noktada durun</li>
                  <li>Telefonunuzu yatay tutun</li>
                  <li>8 farklı yönde fotoğraf çekin (her biri 45°)</li>
                  <li>Her yön için ekrandaki oku takip edin</li>
                  <li>Tüm fotoğraflar otomatik birleştirilecek</li>
                </ol>
              </CardContent>
            </Card>

            <div className="grid grid-cols-4 gap-2">
              {CAPTURE_POINTS.map((point, i) => (
                <div 
                  key={i}
                  className="flex flex-col items-center p-2 bg-muted rounded-lg text-center"
                >
                  <span className="text-2xl">{point.icon}</span>
                  <span className="text-xs mt-1">{point.label}</span>
                </div>
              ))}
            </div>

            <Button 
              onClick={() => setShowInstructions(false)} 
              className="w-full"
            >
              Başla
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Kamera / Çekim Modu */}
        {!showInstructions && !previewMode && (
          <div className="space-y-4">
            {/* İlerleme */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>İlerleme: {completedCount}/8 fotoğraf</span>
                <span className="text-primary font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Mevcut Yön */}
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-4 text-center">
                <span className="text-5xl block mb-2">{currentPoint.icon}</span>
                <h3 className="text-xl font-bold text-primary">{currentPoint.label}</h3>
                <p className="text-muted-foreground">{currentPoint.direction}</p>
                <p className="text-xs text-muted-foreground mt-1">Açı: {currentPoint.angle}°</p>
              </CardContent>
            </Card>

            {/* Kamera Görünümü */}
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-400 mb-3" />
                  <p className="text-sm mb-4">{cameraError}</p>
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Galeriden Yükle
                  </Button>
                </div>
              ) : (
                <video 
                  ref={videoRef} 
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
              )}
              
              {/* Yön Göstergesi Overlay */}
              <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                {currentPoint.icon} {currentPoint.label}
              </div>
              
              {/* Mini harita */}
              <div className="absolute top-4 right-4 bg-black/60 p-2 rounded-lg">
                <div className="grid grid-cols-4 gap-1">
                  {CAPTURE_POINTS.map((_, i) => (
                    <div 
                      key={i}
                      className={`w-3 h-3 rounded-full ${
                        capturedPhotos[i] ? 'bg-green-400' : 
                        i === currentStep ? 'bg-primary animate-pulse' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <canvas ref={canvasRef} className="hidden" />
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Kontroller */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0 || isCapturing}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button 
                className="flex-1"
                onClick={capturePhoto}
                disabled={isCapturing || !!cameraError}
              >
                {isCapturing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Camera className="w-5 h-5 mr-2" />
                    Fotoğraf Çek
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCapturing}
              >
                <ImageIcon className="w-4 h-4" />
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(Math.min(7, currentStep + 1))}
                disabled={currentStep === 7 || isCapturing}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Önizleme butonu */}
            {completedCount >= 4 && (
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => setPreviewMode(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Önizleme ({completedCount} fotoğraf)
              </Button>
            )}
          </div>
        )}

        {/* Önizleme Modu */}
        {!showInstructions && previewMode && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {CAPTURE_POINTS.map((point, i) => (
                <div key={i} className="relative">
                  {capturedPhotos[i] ? (
                    <div className="relative group">
                      <img 
                        src={capturedPhotos[i]} 
                        alt={point.label}
                        className="w-full aspect-video object-cover rounded-lg"
                      />
                      <button
                        onClick={() => retakePhoto(i)}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg"
                      >
                        <RefreshCw className="w-6 h-6 text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
                        <Check className="w-3 h-3 inline" />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => retakePhoto(i)}
                      className="w-full aspect-video bg-muted rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-muted/80 transition-colors"
                    >
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{point.icon}</span>
                    </button>
                  )}
                  <p className="text-xs text-center mt-1 text-muted-foreground">{point.label}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPreviewMode(false)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Düzenle
              </Button>
              <Button variant="outline" onClick={resetCapture}>
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button 
                onClick={createPanorama} 
                disabled={isProcessing || completedCount < 4}
                className="flex-1"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    360° Oluştur
                  </>
                )}
              </Button>
            </div>
            
            {completedCount < 4 && (
              <p className="text-sm text-amber-600 text-center">
                ⚠️ En az 4 fotoğraf gerekli ({4 - completedCount} eksik)
              </p>
            )}
          </div>
        )}

        <DialogFooter className="border-t pt-4">
          <Button variant="ghost" onClick={handleClose}>
            İptal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
