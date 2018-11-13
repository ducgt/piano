import React from 'react';
import '../../../external/MidiSheetMusic/build/bridge';
import '../../../external/MidiSheetMusic/build/MidiSheetMusicBridge'; 
import debounce from 'lodash/debounce';
import '../../../bridgeUtil';
import Easing from 'easing';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import lerp from '../../../util/lerp';

import '../../../style/iomodules/sheet-music-output';

class SheetMusicOutput extends React.Component {
  constructor(props) {
    super(props);

    this.initSheetMusic = this.initSheetMusic.bind(this);
    this.paintSheetMusic = this.paintSheetMusic.bind(this);
    this.clearShadeNotes = this.clearShadeNotes.bind(this);
    this.getScrollOffset = this.getScrollOffset.bind(this);
    this.paintSheetMusic = this.paintSheetMusic.bind(this);
    this.shadeNotes = this.shadeNotes.bind(this);
    this.loadMidiFile = this.loadMidiFile.bind(this);
    this.click = this.click.bind(this);
    this.setSelection = this.setSelection.bind(this);
    this.scroll = this.scroll.bind(this);
    this.handleAutoScrollClick = this.handleAutoScrollClick.bind(this);
    this.scrollTo = this.scrollTo.bind(this);
    this.loadData = this.loadData.bind(this);
    this.saveData = this.saveData.bind(this);

    this.state = {
      selectionStartMs: -1,
      selectionEndMs: -1,
      selectionStartPulse: 0,
      selectionEndPulse: 0,
    };

    this.prevPlayerTimeMillis = 0;
    this.lastScrollPos = -1;
  }

  componentDidMount() {
    this.divCanvasScroll.addEventListener('scroll', debounce(this.scroll, 100));
    window.addEventListener('resize', debounce(this.initSheetMusic, 100));
    this.canvasScrollContents.addEventListener('click', this.click)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.parsedMidiFile !== prevProps.parsedMidiFile) {
      this.loadMidiFile(this.props.parsedMidiFile);
    }
  }

  click(evt) {
    this.clearShadeNotes();
    this.currentPulseTime = this.sheetMusic.PulseTimeForPoint({ X: evt.offsetX, Y: evt.offsetY });
    this.prevPulseTime = this.currentPulseTime - this.measure; 
    if (this.currentPulseTime > this.totalPulses) {
        this.currentPulseTime -= this.measure;
    }
    
    const lastClickMs = this.currentPulseTime / this.pulsesPerMs;
    this.props.callbacks.setCurrentMs(lastClickMs);
    this.shadeNotes(this.currentPulseTime, this.prevPulseTime);
    this.setState({
      isSelecting: true,
      lastClickMs,
      lastClickPulse: this.currentPulseTime,
    });
  }

  initSheetMusic() {
    if (!this.sheetMusic) {
      return;
    }
    
    const canvasHeight = window.innerHeight - this.divCanvasScroll.getBoundingClientRect().top;
    this.canvasShadeNotes.width = this.sheetMusic.Width;
    this.canvasShadeNotes.height = canvasHeight;

    this.canvasMain.width = this.sheetMusic.Width;

    this.divCanvasScroll.style.width = this.sheetMusic.Width + 20 + 'px';
    this.divCanvasScroll.style.height = canvasHeight + 'px';
    this.canvasContainer.style.height = canvasHeight + 'px';
    this.canvasScrollContents.style.height = this.sheetMusic.Height + 'px';

    this.updateSelection(this.state);
  }

  loadMidiFile(parsedMidiFile) {
    window.bridgeUtil.image.preloadImages().then(() => {
      this.pulsesPerMs = parsedMidiFile.getPulsesPerMsec();
      this.totalPulses = parsedMidiFile.getTotalPulses();
      this.measure = parsedMidiFile.getMeasure();
      this.sheetMusic = new MidiSheetMusic.SheetMusic(parsedMidiFile.getMidiFile(), parsedMidiFile.getMidiOptions());
      this.sheetMusic.SetZoom(1.4);
      this.initSheetMusic();
    });
  }

  clearShadeNotes() {
    const ctx = this.canvasShadeNotes.getContext('2d');
    ctx.clearRect(0,0, this.canvasShadeNotes.width, this.canvasShadeNotes.height);
  }

  getScrollOffset() {
    return this.divCanvasScroll.scrollTop;
  }

  paintSheetMusic(clipRectangle) {
    if (!this.sheetMusic) {
      return;
    }

    this.canvasMain.height = this.sheetMusic.Height;
    const args = new MidiSheetMusic.PaintEventArgs();
    clipRectangle = [0, 0, this.sheetMusic.Width, this.sheetMusic.Height];
    args.ClipRectangle = new MidiSheetMusic.Rectangle(0, 0, this.sheetMusic.Width, this.sheetMusic.Height);
    const ctx = this.canvasMain.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0, this.canvasMain.width, this.canvasMain.height);
    this.sheetMusic.OnPaint(args);
    
    this.clearShadeNotes();
    this.shadeNotes(this.currentPulseTime, this.currentPulseTime - this.measure);
  }

  scroll() {
   this.clearShadeNotes();
   this.shadeNotes(this.currentPulseTime, this.currentPulseTime - this.measure);
   if (this.state.autoScroll && !this.isProgrammaticScrolling) {
    this.setState({
      autoScroll: false,
    });
   }
   this.isProgrammaticScrolling = false;
  }

  shadeNotes(currentPulseTime, prevPulseTime) {
    if (!this.sheetMusic) {
      return;
    }

    const offset = this.getScrollOffset();
    const ctx = this.canvasShadeNotes.getContext('2d');
    ctx.translate(0, -offset);
    const scrollPos = this.sheetMusic.ShadeNotes(currentPulseTime, prevPulseTime, true);
    this.scrollTo(scrollPos);
    ctx.translate(0, offset);
  }
  
  scrollTo(scrollPos) {
    if (scrollPos >= 0 && scrollPos !== this.lastScrollPos && this.state.autoScroll) {
      this.lastScrollPos = scrollPos;
      const start = this.divCanvasScroll.scrollTop;
      this.isScrolling = true;
      Easing.event(10, 'sinusoidal', { duration: 200 })
        .on('data', data => {
          this.isProgrammaticScrolling = true;
          this.divCanvasScroll.scrollTop = lerp(start, scrollPos, data)
        });
    }
  }

  animate(playerTimeMillis) {
    this.currentPulseTime = playerTimeMillis * this.pulsesPerMs;
    this.shadeNotes(this.currentPulseTime, this.prevPulseTime);
    this.prevPulseTime = this.currentPulseTime;
  }

  noteOff() {
    if (this.state.selectionStartMs >= 0 && 
      this.state.selectionEndMs >= 0) {
      if (this.currentPulseTime / this.pulsesPerMs > this.state.selectionEndMs) {
        this.props.callbacks.setCurrentMs(this.state.selectionStartMs);
      }
    }
  }

  setSelection(prop) {
    return () => {
      const currentSelection = {
        selectionStartMs: prop ? this.state.selectionStartMs : -1,
        selectionEndMs: prop ? this.state.selectionEndMs : -1,
        selectionStartPulse: prop ? this.state.selectionStartPulse : 0,
        selectionEndPulse: prop ? this.state.selectionEndPulse: 0,
      };
      if (prop) {
        currentSelection[`${prop}Ms`] =
          this.state.lastClickMs;
        currentSelection[`${prop}Pulse`] =
          this.state.lastClickPulse;
      }

      this.setState(currentSelection);
      this.updateSelection(currentSelection);
      this.saveData(currentSelection);
      this.props.saveData && this.props.saveData(currentSelection);
    };
  }

  saveData(toMerge) {
    this.props.saveData && this.props.saveData({
      selectionStartMs: this.state.selectionStartMs,
      selectionEndMs: this.state.selectionEndMs,
      selectionStartPulse: this.state.selectionStartPulse,
      selectionEndPulse: this.state.selectionEndPulse,
      autoScroll: this.state.autoScroll,
      ...toMerge,
    });
  }

  updateSelection(currentSelection) {
    if (!this.sheetMusic) return;

    this.sheetMusic.SelectionStartPulse = currentSelection.selectionStartPulse;
    this.sheetMusic.SelectionEndPulse = currentSelection.selectionEndPulse;
    this.props.callbacks.setCurrentMs(this.state.selectionStartMs);
    this.paintSheetMusic();
  }

  handleAutoScrollClick(evt) {
    const updatedState = { autoScroll: evt.target.checked };
    this.setState(updatedState);
    this.saveData(updatedState);
  }

  loadData(data) {
    this.setState(data);
    this.updateSelection(data);
  }

  render() {
    const defaultCanvasSize = { width: 1, height: 1 };
    return (
      <div className="sheet-music-output">
          <div className="sheet-music-controls">
            { !!(this.state.selectionStartPulse || this.state.selectionEndPulse) && 
              <button type="button" onClick={ this.setSelection(null) }>
                Clear selection
              </button>
            }
            { this.state.isSelecting && 
            <span>
              <button type="button" onClick={ this.setSelection('selectionStart') }>
                Selection start
              </button>
              <button type="button" onClick={ this.setSelection('selectionEnd') }>
                Selection end
              </button>
            </span> }
            <label>
              <input 
                type="checkbox"
                checked={ !!this.state.autoScroll }
                onClick={ this.handleAutoScrollClick } 
              /> Auto scroll
            </label>
          </div>
        
        <div className="canvas-container" ref={ el => this.canvasContainer = el }>
          <div className="canvas-scroll" ref={ el => this.divCanvasScroll = el }>
            <div 
              className="canvas-scroll-contents" 
              ref={ el => this.canvasScrollContents = el } 
            >
            <canvas
              className="canvas-main"
              ref={ el => this.canvasMain = el } 
              {...defaultCanvasSize}
            />
            </div>
          </div>
          <canvas
            style={{zIndex: 1, pointerEvents: 'none'}}
            className="canvas-shadeNotes"
            ref={ el => this.canvasShadeNotes = el } 
            {...defaultCanvasSize}
          />
        </div>
      </div>
    );
  }
}

SheetMusicOutput.propTypes = {
  callbacks: PropTypes.object,
};

const mapStateToProps = state => ({
  parsedMidiFile: state.player.parsedMidiFile,
});

export default connect(mapStateToProps, null, null, { withRef: true })(SheetMusicOutput);