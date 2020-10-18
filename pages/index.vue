<template>
  <div class="container">
    <div class="mb-4">
      <h1 class="display-4">
        <i>Don't Fall Asleep</i>
      </h1>
      <b-button v-b-modal="'info-modal'">Info</b-button>
    </div>
    <b-modal hide-footer id="info-modal">
      <div class="d-block text-center">
        <p style="font-size: large">
          Don't Fall Asleep is a web app that uses your webcam to detect if you
          have fallen asleep. If your eyes are closed, or your head is out of
          the frame, you are considered alseep and the app will play an .mp3
          file of your choice to wake you up. The sound will stop playing only
          when it detects your eyes again.
        </p>
        <b-button
          class="mt-3mr-0 ml-0 w-100"
          block
          variant="outline-danger"
          @click="$bvModal.hide('info-modal')"
          style="text-align: center"
          >I'm ready to sleep deprive myself</b-button
        >
      </div>
    </b-modal>
    <div class="dashboardContainer card shadow bg-white rounded">
      <div class="videoContainer">
        <div v-if="!cvLoaded">
          <div v-if="loading"><i class="spinner-border"></i></div>
        </div>

        <div v-if="videoStreamLoading"><i class="spinner-border"></i></div>

        <canvas
          v-else
          id="canvasOutput"
          :style="{ display: loading || !cvInterval ? 'none' : '' }"
        ></canvas>
        <b-button
          v-if="!cvInterval"
          :disabled="!cvLoaded"
          @click="onOpenCvReady"
        >
          Start Camera
        </b-button>

        <b-button v-else @click="stopCv">
          Stop Camera
        </b-button>
      </div>
      <div style="max-width: 30em; width: 50%">
        <b-form-input
          v-model="soundTriggerTime"
          type="range"
          min="3000"
          max="60000"
        ></b-form-input>
        <p style="margin-bottom: 1em">
          Time sleeping before alarm triggers:
          {{ Math.round(soundTriggerTime / 1000) }} seconds
        </p>

        <b-form-file
          accept=".mp3"
          @change="onAudioUpload"
          :disabled="soundPlaying"
          placeholder="Choose a .mp3 file"
          drop-placeholder="Drop file here..."
        ></b-form-file>
        <div v-if="audioName" class="mt-3">File Uploaded: {{ audioName }}</div>

        <p
          v-if="timeWithoutSeeingEyes > 0"
          style="margin-top: 1em; font-weight: 400"
        >
          Your eyes have been closed for
          {{ Math.round(timeWithoutSeeingEyes / 1000) }} seconds
        </p>
      </div>
    </div>

    <video
      id="webcam"
      autoplay
      width="640"
      height="480"
      style="display: none"
    ></video>
  </div>
</template>

<script>
const faceCascadeFile = "haarcascade_frontalface_default.xml";
const eyeCascadeFile = "haarcascade_eye.xml";
let video = null;
let videoStream = null;

export default {
  data() {
    return {
      loading: true,
      soundPlaying: false,
      cvInterval: null,
      soundTriggerTime: 3000,
      timeWithoutSeeingEyes: 0,
      audio: null,
      cvLoaded: false,
      audioName: "SeinfeldTheme.mp3",
      videoSetUpComplete: false,
      proccessVideo: null,
      videoStreamLoading: false
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
            cv.onRuntimeInitialized = () => {
              this.cvLoaded = true;
            };
            // this.onOpenCvReady();
            console.log("callback called");
          }
        }
      ]
    };
  },
  mounted() {
    video = document.getElementById("webcam");
    this.audio = new Audio("SeinfeldTheme.mp3");
    this.audio.addEventListener("ended", () => {
      this.audio.currentTime = 0;
      this.audio.play();
    });
  },
  methods: {
    onAudioUpload(e) {
      console.log(e);
      e = e.target.files[0];
      let reader = new FileReader();
      this.audioName = e.name;
      reader.onload = e => {
        let dataURL = e.target.result;
        this.audio = new Audio(dataURL);
        this.audio.addEventListener("ended", () => {
          this.audio.currentTime = 0;
          this.audio.play();
        });
      };
      reader.readAsDataURL(e);
    },
    startCv() {
      this.videoStreamLoading = true;
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(stream => {
          videoStream = stream;
          video.srcObject = videoStream;
          // use createFileFromUrl to "pre-build" the xml
          this.cvInterval ? clearInterval(this.cvInterval) : null;
          this.cvInterval = setInterval(this.processVideo, 0);
        })
        .catch(function(err0r) {
          console.log(err0r);
        });
    },
    stopCv() {
      clearInterval(this.cvInterval);
      this.cvInterval = null;
      this.soundPlaying = false;
      this.audio.pause();
      videoStream.getTracks().forEach(function(track) {
        track.stop();
      });
      this.timeWithoutSeeingEyes = 0;
      this.loading = true;
    },
    onOpenCvReady() {
      console.log("onOpenCvReady called");
      let utils = new this.Utils("errorMessage"); //use utils class
      if (this.videoSetUpComplete) {
        this.startCv();
        return;
      }

      this.videoStreamLoading = true;
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(stream => {
          videoStream = stream;
          video.srcObject = videoStream;
          // use createFileFromUrl to "pre-build" the xml
          utils.createFileFromUrl(faceCascadeFile, faceCascadeFile, () => {
            utils.createFileFromUrl(eyeCascadeFile, eyeCascadeFile, () => {
              this.videoSetUpComplete = true;
              this.setUpProcessVideo();
            });
          });
        })
        .catch(function(err0r) {
          console.log(err0r);
        });
    },
    setUpProcessVideo() {
      const cap = new cv.VideoCapture(video);
      const src = new cv.Mat(video.height, video.width, cv.CV_8UC4);

      const gray = new cv.Mat();

      let cropped;
      const resized = new cv.Mat();

      const faces = new cv.RectVector();
      const eyes = new cv.RectVector();
      const faceCascade = new cv.CascadeClassifier();
      const eyeCascade = new cv.CascadeClassifier();

      const msize = new cv.Size(0, 0);
      const dsize = new cv.Size(300, 300);

      let rect;

      let difference;
      if (video.width > video.height) {
        difference = (video.width - video.height) / 2;
        rect = new cv.Rect(difference, 0, video.height, video.height);
      } else {
        difference = (video.height - video.width) / 2;
        rect = new cv.Rect(0, difference, video.width, video.width);
      }

      faceCascade.load(faceCascadeFile);
      eyeCascade.load(eyeCascadeFile);

      let processVideo = () => {
        let begin = Date.now();
        // start processing.

        cap.read(src);

        cropped = src.roi(rect);
        cv.resize(cropped, resized, dsize, 0, 0, cv.INTER_AREA);
        cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY, 0);

        let eyesMax = 0;

        //running the model to find the face
        faceCascade.detectMultiScale(gray, faces, 1.1, 3, 0, msize, msize);

        // Draws rectangles around the face
        for (let i = 0; i < faces.size(); ++i) {
          let roiGray = gray.roi(faces.get(i));
          let roiSrc = resized.roi(faces.get(i));

          // //running the model to detect the eyes
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

          if (eyes.size() > 0) {
            let point1 = new cv.Point(faces.get(i).x, faces.get(i).y);
            let point2 = new cv.Point(
              faces.get(i).x + faces.get(i).width,
              faces.get(i).y + faces.get(i).height
            );
            cv.rectangle(resized, point1, point2, [255, 0, 0, 255]);
          }

          if (eyesMax < eyes.size()) eyesMax = eyes.size();

          roiGray.delete();
          roiSrc.delete();
        }

        let processingTimeMillis = Date.now() - begin;

        if (eyesMax == 0) {
          this.timeWithoutSeeingEyes += processingTimeMillis;
        } else {
          this.timeWithoutSeeingEyes = 0;
        }

        if (this.timeWithoutSeeingEyes > this.soundTriggerTime) {
          if (!this.soundPlaying) {
            this.soundPlaying = true;
            this.audio.currentTime = 0;
            this.audio.play();
            console.log("Playing audio");
          }
        } else {
          this.soundPlaying = false;
          this.audio.pause();
        }

        //setting loading here because it takes a while for the process to run the first time
        this.loading = false;
        this.videoStreamLoading = false;

        // Draws cv output (src) onto id="canvasOutput"
        cv.imshow("canvasOutput", resized);
      };
      this.processVideo = processVideo;
      // start processing the video
      this.cvInterval = setInterval(processVideo, 0);
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
    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }
  }
};
</script>

<style scoped lang="scss">
.container {
  margin: 0 auto;
  min-height: 95vh;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  text-align: center;
  flex-direction: column;
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

#canvasOutput {
  border-radius: 0.5rem;
}

.dashboardContainer {
  display: flex;
  flex-direction: row;
  justify-content: space-around;
  width: 100%;
  padding: 3em 1em;
}

.videoContainer {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 300px;
  height: 350px;
}

.btn {
  width: 10em;
  margin: 1rem;
}
</style>
