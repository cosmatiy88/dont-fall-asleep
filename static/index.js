// let utils = new Utils("errorMessage"); //use utils class
// let averageEyes = 2;
// const TRIGGER_AVERAGE = 0.3;
// let playingSound = false;
// let soundPlaying = false;
// let audio = new Audio("SeinfeldTheme.mp3");
// let processVideo;
// let cvInterval;

// function onOpenCvReady() {
//     console.log("onOpenCvReady");
//     cv["onRuntimeInitialized"] = () => {
//         //initializing cv variables

//         const video = document.getElementById("webcam");


//         const cap = new cv.VideoCapture(video);
//         const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);

//         const faceCascadeFile = "haarcascade_frontalface_default.xml";
//         const eyeCascadeFile = "haarcascade_eye.xml";

//         const gray = new cv.Mat();
//         const faces = new cv.RectVector();
//         const eyes = new cv.RectVector();
//         const faceCascade = new cv.CascadeClassifier();
//         const eyeCascade = new cv.CascadeClassifier();

//         const msize = new cv.Size(0, 0);

//         navigator.mediaDevices
//             .getUserMedia({ video: true })
//             .then(function(stream) {
//                 video.srcObject = stream;

//                 // use createFileFromUrl to "pre-build" the xml
//                 utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
//                     faceCascade.load(faceCascadeFile);
//                     utils.createFileFromUrl(eyeCascadeFile, eyeCascadeFile, () => {
//                         eyeCascade.load(eyeCascadeFile);

//                         //process video
//                         const FPS = 30;

//                         processVideo = () => {
//                             // let begin = Date.now();
//                             // start processing.

//                             cap.read(src);
//                             cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

//                             let eyesMax = 0;

//                             //running the model to find the face
//                             faceCascade.detectMultiScale(
//                                 gray,
//                                 faces,
//                                 1.1,
//                                 3,
//                                 0,
//                                 msize,
//                                 msize
//                             );

//                             // Draws rectangles around the face
//                             for (let i = 0; i < faces.size(); ++i) {
//                                 let roiGray = gray.roi(faces.get(i));
//                                 let roiSrc = src.roi(faces.get(i));
//                                 let point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
//                                 let point2 = new cv.Point(
//                                     faces.get(i).x + faces.get(i).width,
//                                     faces.get(i).y + faces.get(i).height
//                                 );
//                                 cv.rectangle(src, point1, point2, [255, 0, 0, 255]);

//                                 //running the model to detect the eyes
//                                 eyeCascade.detectMultiScale(roiGray, eyes);

//                                 //draw rectangles around the eyes
//                                 for (let j = 0; j < eyes.size(); ++j) {
//                                     let point1 = new cv.Point(eyes.get(j).x, eyes.get(j).y);
//                                     let point2 = new cv.Point(
//                                         eyes.get(j).x + eyes.get(j).width,
//                                         eyes.get(j).y + eyes.get(j).height
//                                     );
//                                     cv.rectangle(roiSrc, point1, point2, [0, 0, 255, 255]);
//                                 }

//                                 if (eyesMax < eyes.size()) eyesMax = eyes.size();

//                                 roiGray.delete();
//                                 roiSrc.delete();
//                             }

//                             averageEyes = 0.8 * averageEyes + 0.2 * eyesMax;

//                             console.log(averageEyes);

//                             if (averageEyes < TRIGGER_AVERAGE) {
//                                 if (!playSound && !soundPlaying) {
//                                     playSound = true;

//                                     startSound();
//                                 }
//                             } else {
//                                 playSound = false;
//                             }

//                             ////////////////////////////////

//                             // Draws cv output (src) onto id="canvasOutput"
//                             cv.imshow("canvasOutput", src);

//                             // let delay = 1000 / FPS - (Date.now() - begin);
//                         };

//                         // Processes video
//                         cvInterval = setInterval(processVideo, 40);
//                     });
//                 });
//             })
//             .catch(function(err0r) {
//                 console.log(err0r);
//             });
//     };
// }

// async function startSound() {
//     while (audio.readyState != 4) {
//         await sleep(100);
//     }

//     audio.play();
//     console.log("playing song");
//     soundPlaying = true;

//     audio.addEventListener("ended", function() {
//         audio.currentTime = 0;
//     });

//     while (playSound) {
//         await sleep(50);
//     }

//     console.log("pausing");

//     audio.pause();
//     audio.currentTime = 0;
//     soundPlaying = false;
// }

// function sleep(ms) {
//     return new Promise(resolve => setTimeout(resolve, ms));
// }