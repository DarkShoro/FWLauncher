const START_COLOR = '#404dff';
const END_COLOR = '#1b257d';
const WAVES = [{
    offset: .25,
    speed: .2,
    width: 500,
    height: 50
}, {
    offset: .5,
    speed: -0.3,
    width: 500,
    height: 50
}, {
    offset: .75,
    speed: .6,
    width: 500,
    height: 50
}];

const background = $(".wave-background");
const $canvas = document.createElement('canvas');
$canvas.classList.add('backdrop');
$(background).append($canvas);
const ctx = $canvas.getContext('2d');

function resize() {
    $canvas.width = innerWidth;
    $canvas.height = innerHeight;
    update(false);
}
addEventListener('resize', resize);
resize();

async function update(loop = true) {

    // background

    let grad = ctx.createLinearGradient(
        0, 0,
        0, innerHeight
    );
    grad.addColorStop(0, START_COLOR);
    grad.addColorStop(1, END_COLOR);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    // waves

    for (let {
            offset,
            speed,
            width,
            height
        }
        of WAVES) {

        // draw

        ctx.beginPath();

        let y = innerHeight * offset;

        ctx.moveTo(0, y);

        for (let x = 0; x <= innerWidth; x++) {
            ctx.lineTo(x, Math.sin(
                (x - Date.now() * speed) * Math.PI /
                (2 * width)
            ) * height + y);
        }

        ctx.lineTo(innerWidth, innerHeight);
        ctx.lineTo(0, innerHeight);

        // gradient

        let grad = ctx.createLinearGradient(0, y - height, 0, innerHeight);
        grad.addColorStop(0, START_COLOR);
        grad.addColorStop(1, END_COLOR);
        ctx.fillStyle = grad;
        ctx.fill();

    }

    if (loop) requestAnimationFrame(update);
}
update();