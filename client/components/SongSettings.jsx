import React from 'react';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { updateTrackDisplay, updateTrackPlay } from '../actions/playerActions';

class SongSettings extends React.Component {
  constructor(props) {
    super(props);

    this.updateTrack = this.updateTrack.bind(this);
    this.updateTrackAll = this.updateTrackAll.bind(this);
    this.updateTrackPlayAndDisplay = this.updateTrackPlayAndDisplay.bind(this);
  }

  updateTrackAll(propName) {
    return () => {
      //don't include Percussion tracks in display by default
      const tracksToUpdate = this.props.trackSettings
      .map((track, index) => ({
        track,
        index,
      }))
      .filter(t => propName ==='Play' || t.track.name !== 'Percussion');
      
      this.props[`updateTrack${propName}`](
        tracksToUpdate.map(t=>t.index),
        !tracksToUpdate.some(
          t => t.track[propName === 'Display' ? 'display' : 'play'],
        ),
      );
    };
  }

  updateTrack(trackIndexes, propName) {
    return evt =>
      this.props[`updateTrack${propName}`](trackIndexes, evt.target.checked);
  }

  updateTrackPlayAndDisplay(trackIndex) {
    return () => {
      const newState = !this.props.trackSettings[trackIndex].display && !this.props.trackSettings[trackIndex].play;
      this.props.updateTrackPlay(trackIndex, newState);
      this.props.updateTrackDisplay(trackIndex, newState);
    };
  }

  render() {
    return (
      <table className="song-tracks">
        <thead>
          <tr>
            <th>&nbsp;</th>
            <th>
              <button type="button" onClick={this.updateTrackAll('Display')}>
                <FontAwesomeIcon icon="eye" />
              </button>
            </th>
            <th>
              <button type="button" onClick={this.updateTrackAll('Play')}>
                <FontAwesomeIcon icon="volume-up" />
              </button>
            </th>
            <th className="display-play">
              <button type="button">
                <FontAwesomeIcon icon="eye" className="top-left-icon" />
                <span className="slash">/</span>
                <FontAwesomeIcon icon="volume-up" className="bottom-right-icon" />
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          {this.props.trackSettings &&
            this.props.trackSettings.map((track, index) => (
              <tr key={index}>
                <td>{track.name}</td>
                <td className="td-checkbox">
                  <input
                    type="checkbox"
                    checked={track.display}
                    onChange={this.updateTrack([index], 'Display')}
                  />
                </td>
                <td className="td-checkbox">
                  <input
                    type="checkbox"
                    checked={track.play}
                    onChange={this.updateTrack([index], 'Play')}
                  />
                </td>
                <td className="td-checkbox">
                  <input
                    type="checkbox"
                    checked={track.play || track.display}
                    onChange={this.updateTrackPlayAndDisplay([index])}
                  />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    );
  }
}

SongSettings.propTypes = {
  trackSettings: PropTypes.array,
  updateTrackPlay: PropTypes.func,
  updateTrackDisplay: PropTypes.func,
};

const mapStateToProps = state => ({
  trackSettings: state.player.trackSettings,
});

const mapDispatchToProps = dispatch => ({
  updateTrackPlay: (trackIndex, prop, play) =>
    dispatch(updateTrackPlay(trackIndex, prop, play)),
  updateTrackDisplay: (trackIndex, prop, show) =>
    dispatch(updateTrackDisplay(trackIndex, prop, show)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(SongSettings);
