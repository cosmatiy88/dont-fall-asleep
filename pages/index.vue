<template>
  <div class="container">
    <div>
      <Logo />
      <h1 class="title">
        Stay Awake
      </h1>
      <p id="status">OpenCV.js status: {{ status }}</p>

      <canvas id="canvasOutput"></canvas>

      <!-- <script async src="./utils.js" type="text/javascript"></script>
      <script async src="./index.js" type="text/javascript"></script> -->
      <!-- <script
        async
        src="opencv.js"
        onload="onOpenCvReady();"
        type="text/javascript"
      ></script> -->

      <!-- <script
        async
        src="https://docs.opencv.org/master/opencv.js"
        :onload="onOpenCvReady()"
        type="text/javascript"
      ></script> -->
      <!-- should be able to download fron cdn -->
      <video id="webcam" autoplay playsinline width="640" height="480"></video>
      <canvas id="canvas" class="d-none"></canvas>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      status: "not loaded"
    };
  },
  mounted() {
    console.log(cv);
    this.onOpenCvReady();
  },
  methods: {
    onOpenCvReady: function() {
      console.log("Open CV Loaded");
      this.status = "loaded";

      cv["onRuntimeInitialized"] = () => {
        this.status = "onRuntimeInitialized"
      };
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
