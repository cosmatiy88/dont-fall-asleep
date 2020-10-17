<template>
  <div class="container">
    <div>
      <h1 class="title">
        Stay Awake
      </h1>
      <p id="status">OpenCV.js status: {{ status }}</p>

      <canvas id="canvasOutput"></canvas>

      <video id="webcam" autoplay playsinline width="640" height="480"></video>

      <canvas id="canvas" class="d-none"></canvas>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      status: "not loaded",
      audio: null,
      soundPlaying: false,
      playSound: false
    };
  },
  head() {
    return {
      script: [
        {
          type: "text/javascript",
          src: "https://docs.opencv.org/master/opencv.js",
          async: true,
          body: true,
          callback: () => {
            this.onOpenCvReady();
            console.log("callback called");
            this.status = "loaded";
          }
        }
      ]
    };
  },
  mounted() {},
  methods: {
    startCv() {
      cvInterval ? cvInterval.clearInterval() : null;
      cvInterval = setInterval(processVideo, 40);
    },
    stopCv() {
      cvInterval.clearInterval();
    },
    onOpenCvReady() {
      let utils = new this.Utils("errorMessage"); //use utils class
      let averageEyes = 2;
      const TRIGGER_AVERAGE = 0.3;
      this.audio = new Audio("SeinfeldTheme.mp3");
      let processVideo;
      let cvInterval;

      cv["onRuntimeInitialized"] = () => {
        //initializing cv variables

        const video = document.getElementById("webcam");

        const cap = new cv.VideoCapture(video);
        const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);

        const faceCascadeFile = "haarcascade_frontalface_default.xml";
        const eyeCascadeFile = "haarcascade_eye.xml";

        const gray = new cv.Mat();
        const faces = new cv.RectVector();
        const eyes = new cv.RectVector();
        const faceCascade = new cv.CascadeClassifier();
        const eyeCascade = new cv.CascadeClassifier();

        const msize = new cv.Size(0, 0);

        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then(stream => {
            video.srcObject = stream;

            // use createFileFromUrl to "pre-build" the xml
            utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
              faceCascade.load(faceCascadeFile);
              utils.createFileFromUrl(eyeCascadeFile, eyeCascadeFile, () => {
                eyeCascade.load(eyeCascadeFile);

                //process video
                const FPS = 30;

                processVideo = () => {
                  // let begin = Date.now();
                  // start processing.

                  cap.read(src);
                  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

                  let eyesMax = 0;

                  //running the model to find the face
                  faceCascade.detectMultiScale(
                    gray,
                    faces,
                    1.1,
                    3,
                    0,
                    msize,
                    msize
                  );

                  // Draws rectangles around the face
                  for (let i = 0; i < faces.size(); ++i) {
                    let roiGray = gray.roi(faces.get(i));
                    let roiSrc = src.roi(faces.get(i));
                    let point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
                    let point2 = new cv.Point(
                      faces.get(i).x + faces.get(i).width,
                      faces.get(i).y + faces.get(i).height
                    );
                    cv.rectangle(src, point1, point2, [255, 0, 0, 255]);

                    //running the model to detect the eyes
                    eyeCascade.detectMultiScale(roiGray, eyes);

                    //draw rectangles around the eyes
                    for (let j = 0; j < eyes.size(); ++j) {
                      let point1 = new cv.Point(eyes.get(j).x, eyes.get(j).y);
                      let point2 = new cv.Point(
                        eyes.get(j).x + eyes.get(j).width,
                        eyes.get(j).y + eyes.get(j).height
                      );
                      cv.rectangle(roiSrc, point1, point2, [0, 0, 255, 255]);
                    }

                    if (eyesMax < eyes.size()) eyesMax = eyes.size();

                    roiGray.delete();
                    roiSrc.delete();
                  }

                  averageEyes = 0.8 * averageEyes + 0.2 * eyesMax;

                  console.log(averageEyes);

                  if (averageEyes < TRIGGER_AVERAGE) {
                    if (!this.playSound && !this.soundPlaying) {
                      this.playSound = true;

                      this.startSound();
                    }
                  } else {
                    this.playSound = false;
                  }

                  // Draws cv output (src) onto id="canvasOutput"
                  cv.imshow("canvasOutput", src);

                  // let delay = 1000 / FPS - (Date.now() - begin);
                };

                // Processes video
                cvInterval = setInterval(processVideo, 40);
              });
            });
          })
          .catch(function(err0r) {
            console.log(err0r);
          });
      };
    },
    Utils(errorOutputId) {
      // eslint-disable-line no-unused-vars
      let self = this;
      this.errorOutput = document.getElementById(errorOutputId);

      const OPENCV_URL = "opencv.js";

      this.loadOpenCv = function(onloadCallback) {
        let script = document.createElement("script");
        script.setAttribute("async", "");
        script.setAttribute("type", "text/javascript");
        script.addEventListener("load", () => {
          if (cv.getBuildInformation) {
            console.log(cv.getBuildInformation());
            onloadCallback();
          } else {
            // WASM
            cv["onRuntimeInitialized"] = () => {
              console.log(cv.getBuildInformation());
              onloadCallback();
            };
          }
        });
        script.addEventListener("error", () => {
          self.printError("Failed to load " + OPENCV_URL);
        });
        script.src = OPENCV_URL;
        let node = document.getElementsByTagName("script")[0];
        node.parentNode.insertBefore(script, node);
      };

      this.createFileFromUrl = function(path, url, callback) {
        let request = new XMLHttpRequest();
        request.open("GET", url, true);
        request.responseType = "arraybuffer";
        request.onload = function(ev) {
          if (request.readyState === 4) {
            if (request.status === 200) {
              let data = new Uint8Array(request.response);
              cv.FS_createDataFile("/", path, data, true, false, false);
              callback();
            } else {
              self.printError(
                "Failed to load " + url + " status: " + request.status
              );
            }
          }
        };
        request.send();
      };

      this.loadImageToCanvas = function(url, cavansId) {
        let canvas = document.getElementById(cavansId);
        let ctx = canvas.getContext("2d");
        let img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function() {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0, img.width, img.height);
        };
        img.src = url;
      };

      this.clearError = function() {
        this.errorOutput.innerHTML = "";
      };

      this.printError = function(err) {
        if (typeof err === "undefined") {
          err = "";
        } else if (typeof err === "number") {
          if (!isNaN(err)) {
            if (typeof cv !== "undefined") {
              err = "Exception: " + cv.exceptionFromPtr(err).msg;
            }
          }
        } else if (typeof err === "string") {
          let ptr = Number(err.split(" ")[0]);
          if (!isNaN(ptr)) {
            if (typeof cv !== "undefined") {
              err = "Exception: " + cv.exceptionFromPtr(ptr).msg;
            }
          }
        } else if (err instanceof Error) {
          err = err.stack.replace(/\n/g, "<br>");
        }
        this.errorOutput.innerHTML = err;
      };

      function onVideoCanPlay() {
        if (self.onCameraStartedCallback) {
          self.onCameraStartedCallback(self.stream, self.video);
        }
      }

      this.startCamera = function(resolution, callback, videoId) {
        const constraints = {
          qvga: { width: { exact: 320 }, height: { exact: 240 } },
          vga: { width: { exact: 640 }, height: { exact: 480 } }
        };
        let video = document.getElementById(videoId);
        if (!video) {
          video = document.createElement("video");
        }

        let videoConstraint = constraints[resolution];
        if (!videoConstraint) {
          videoConstraint = true;
        }

        navigator.mediaDevices
          .getUserMedia({ video: videoConstraint, audio: false })
          .then(function(stream) {
            video.srcObject = stream;
            video.play();
            self.video = video;
            self.stream = stream;
            self.onCameraStartedCallback = callback;
            video.addEventListener("canplay", onVideoCanPlay, false);
          })
          .catch(function(err) {
            self.printError("Camera Error: " + err.name + " " + err.message);
          });
      };

      this.stopCamera = function() {
        if (this.video) {
          this.video.pause();
          this.video.srcObject = null;
          this.video.removeEventListener("canplay", onVideoCanPlay);
        }
        if (this.stream) {
          this.stream.getVideoTracks()[0].stop();
        }
      };
    },
    startSound: async function() {
      while (this.audio.readyState != 4) {
        await this.sleep(100);
      }

      this.audio.play();
      console.log("playing song");
      this.soundPlaying = true;

      this.audio.addEventListener("ended", function() {
        this.audio.currentTime = 0;
      });

      while (this.playSound) {
        await this.sleep(50);
      }

      console.log("pausing");

      this.audio.pause();
      this.audio.currentTime = 0;
      this.soundPlaying = false;
    },
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.title {
  font-family: "Quicksand", "Source Sans Pro", -apple-system, BlinkMacSystemFont,
    "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  display: block;
  font-weight: 300;
  font-size: 100px;
  color: #35495e;
  letter-spacing: 1px;
}

.subtitle {
  font-weight: 300;
  font-size: 42px;
  color: #526488;
  word-spacing: 5px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}
</style>
