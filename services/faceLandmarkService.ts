import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { FaceFeatures, BoundingBox } from "../types";

console.log("FaceLandmarkService module loaded (Local Mode)");

let faceLandmarker: any = null;

/**
 * 初始化 MediaPipe FaceLandmarker
 */
export const initFaceLandmarker = async () => {
    // 防止重复初始化
    if (faceLandmarker) return faceLandmarker;

    console.log("Initializing MediaPipe FaceLandmarker...");

    try {
        // 1. 加载 WASM (WebAssembly) 文件
        // 使用 jsdelivr CDN 加载资源文件，这是最稳妥的方式
        const vision = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        // 2. 创建检测器实例
        faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            runningMode: "IMAGE",
            numFaces: 1
        });

        console.log("MediaPipe FaceLandmarker initialized successfully ✅");
        return faceLandmarker;

    } catch (e) {
        console.error("Failed to initialize MediaPipe:", e);
        return null;
    }
};

/**
 * 将关键点坐标转换为边界框 (0-1000 比例)
 */
const getBoundingBox = (landmarks: any[], indices: number[], width: number, height: number): BoundingBox => {
    let xmin = 1, ymin = 1, xmax = 0, ymax = 0;

    indices.forEach(index => {
        const p = landmarks[index];
        if (!p) return;
        // p.x 和 p.y 是归一化的 [0, 1]
        if (p.x < xmin) xmin = p.x;
        if (p.x > xmax) xmax = p.x;
        if (p.y < ymin) ymin = p.y;
        if (p.y > ymax) ymax = p.y;
    });

    // 转换为 0-1000 整数坐标，方便后续处理
    return {
        xmin: Math.floor(xmin * 1000),
        ymin: Math.floor(ymin * 1000),
        xmax: Math.floor(xmax * 1000),
        ymax: Math.floor(ymax * 1000),
    };
};

/**
 * 检测人脸特征并返回边界框
 */
export const detectLandmarks = async (imageSrc: string): Promise<FaceFeatures | undefined> => {
    try {
        const landmarker = await initFaceLandmarker();
        if (!landmarker) {
            console.warn("FaceLandmarker not ready.");
            return undefined;
        }

        // 创建图片对象
        const image = new Image();
        image.src = imageSrc;
        image.crossOrigin = "anonymous"; // 处理跨域图片
        
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = (e) => reject(new Error("Failed to load image for MediaPipe"));
        });

        const result = landmarker.detect(image);

        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
            const landmarks = result.faceLandmarks[0];
            
            // --- 核心关键点索引 (MediaPipe 478点 Face Mesh) ---
            
            // 左眼 + 右眼 (合并以获得更完整的眼部区域)
            const eyeIndices = [33, 133, 160, 159, 158, 144, 145, 153, 246, 7, 362, 263, 387, 386, 385, 373, 374, 380, 249];
            
            // 左眉 + 右眉 (合并以获得完整的眉部区域)
            const browIndices = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46, 336, 296, 334, 293, 300, 285, 295, 282, 283, 276];
            
            // 嘴唇 (包含内外唇)
            const lipIndices = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185, 78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191];

            return {
                eyes: getBoundingBox(landmarks, eyeIndices, image.width, image.height),
                brows: getBoundingBox(landmarks, browIndices, image.width, image.height),
                lips: getBoundingBox(landmarks, lipIndices, image.width, image.height)
            };
        }
    } catch (err) {
        console.error("Error during landmark detection:", err);
    }

    return undefined;
};