/**
 * Copyright (c) 2015-present, Zippy Technologies
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Notification from './Notification';
import find from '../../common/find';
import join from '../../common/join';
import getDefaultConfig from './utils/getDefaultConfig';
import addPositions from './utils/addPositions';
import separateNotificationsByStacking from './utils/separateNotificationsByStacking';

class NotificationBoard extends Component {
  constructor(props) {
    super(props);

    this.notificationId = 0;

    this.state = {
      notifications: this.normalizeNotifications(props.defaultNotifications)
    };

    this.handleNotificationClose = this.handleNotificationClose.bind(this);
    this.updateNotification = this.updateNotification.bind(this);
    this.addNotification = this.addNotification.bind(this);
    this.showNotification = this.showNotification.bind(this);
    this.handleNotificationSizeChange = this.handleNotificationSizeChange.bind(
      this
    );
    this.handleNotificationHide = this.handleNotificationHide.bind(this);
    this.handleNotificationShow = this.handleNotificationShow.bind(this);
    this.handleWindowScroll = this.handleWindowScroll.bind(this);

    this.setRootRef = el => {
      this.rootNode = el;
    };
  }

  componentDidMount() {
    this.register();

    if (this.props.updatePositionOnScroll) {
      window.addEventListener('scroll', this.handleWindowScroll);
    }
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.notifications !== nextProps.notifications) {
      const newNotifications = this.normalizeNotifications(
        nextProps.notifications
      );
      this.setNotifications(newNotifications);
    }
  }

  componentWillUnmount() {
    this.unregister();
    window.removeEventListener('scroll', this.handleWindowScroll);
  }

  render() {
    const props = this.props;
    const className = join(props.className);

    const style = {};

    if (this.props.zIndex) {
      style.zIndex = this.props.zIndex;
    }

    return (
      <div className={className} ref={this.setRootRef} style={style}>
        {this.getNotifications().map((config, index) => {
          // if closed it should not be rendered

          if (config.closed) {
            return null;
          }

          return (
            <Notification
              {...config}
              ref={el => (this[`notification-${config.id}`] = el)}
              key={config.id === undefined ? index : config.id}
              relativeToViewport={props.relativeToViewport}
              onHide={this.handleNotificationHide}
              onClose={this.handleNotificationClose}
              onSizeChange={this.handleNotificationSizeChange}
              onShow={this.handleNotificationShow}
            />
          );
        })}
      </div>
    );
  }

  /**
   * Takes a description of the new notification
   * it merges it over the default configuration from
   * global props.
   *
   * Selects all the notification with the current stacking and updates
   * their position and then concatinates them back to the list
   *
   *
   *  At this point a notification has no size
   *
   */
  addNotification(config = {}) {
    const newNotification = this.normalizeNotification(config);
    const currentStacking = newNotification.stacking;
    const notifications = this.getNotifications();
    const isPushStart = newNotification.push === 'start';
    const maxNotificationsPerStacking = this.props.maxNotificationsPerStacking;

    let {
      filteredNotifications,
      otherNotifications
    } = separateNotificationsByStacking({
      notifications,
      stacking: currentStacking
    });

    if (isPushStart) {
      filteredNotifications = [newNotification, ...filteredNotifications];
    } else {
      filteredNotifications = [...filteredNotifications, newNotification];
    }

    const notificationsOverflow =
      maxNotificationsPerStacking &&
      maxNotificationsPerStacking < filteredNotifications.length;

    if (notificationsOverflow) {
      const notificationsOverflow =
        filteredNotifications.length - maxNotificationsPerStacking;

      filteredNotifications = isPushStart
        ? filteredNotifications.slice(0, -notificationsOverflow)
        : filteredNotifications.slice(notificationsOverflow);

      filteredNotifications = this.addPositions({
        notifications: filteredNotifications,
        stacking: currentStacking
      });
    }

    // update position only if it has width/height
    if (
      (newNotification.width && newNotification.height) ||
      notificationsOverflow
    ) {
      filteredNotifications = this.addPositions({
        notifications: filteredNotifications,
        stacking: currentStacking
      });
    }

    const newNotifications = [...filteredNotifications, ...otherNotifications];
    this.setNotifications(newNotifications);

    if (this.props.onShow) {
      this.props.onShow(newNotification.id);
    }
    return newNotification.id;
  }

  setNotifications(notifications, done = () => {}) {
    this.setState({ notifications }, done);
  }

  /**
   * Takes notifications
   */
  addPositions({ notifications, stacking }) {
    return addPositions({
      notifications,
      stacking,
      relativeToViewport: this.props.relativeToViewport,
      regionOffset: this.props.regionOffset,
      region: this.props.region,
      stackingWrap: this.props.stackingWrap,
      board: this,
      rootNode: this.getRootNode()
    });
  }

  updatePositionForStack({ notifications, stacking }) {
    let {
      filteredNotifications,
      otherNotifications
    } = separateNotificationsByStacking({
      notifications,
      stacking
    });

    filteredNotifications = this.addPositions({
      notifications: filteredNotifications,
      stacking
    });

    return [...filteredNotifications, ...otherNotifications];
  }

  /*
   * Calculates positions for all notifications
   */
  updateAllStackPositions(notifications) {
    if (!notifications) {
      notifications = this.getNotifications();
    }

    if (!notifications) {
      return null;
    }

    const stackings = notifications
      .reduce((acc, item) => {
        const stacking = item.stacking.join && item.stacking.join('-');
        if (acc.indexOf(stacking) === -1) {
          acc.push(stacking);
        }
        return acc;
      }, [])
      .map(stacking => stacking.split('-'));

    const newNotifications = stackings.reduce((acc, stacking) => {
      acc = this.updatePositionForStack({ notifications, stacking });

      return acc;
    }, []);

    return newNotifications;
  }

  /**
   * Returns an array of notifications
   */
  getNotifications() {
    return this.isNotificationsControled()
      ? this.props.notifications
      : this.state.notifications;
  }

  getNotification(id) {
    const notifications = this.getNotifications();
    return find(notifications, o => o.id === id);
  }

  getNotificationInstance(id) {
    return this[`notification-${id}`];
  }

  isNotificationsControled() {
    return this.props.notifications !== undefined;
  }

  getNewNotificationId() {
    const id = this.notificationId;
    this.notificationId += 1;

    return id;
  }

  getRootNode() {
    return this.rootNode;
  }

  hideNotification(id) {
    const found = this.updateNotification({
      id,
      changes: { visible: false }
    });
    this.props.onHide(id);

    return found;
  }

  hideAll() {
    const notifications = this.getNotifications();
    const newNotifications = notifications.map(notification => {
      return {
        ...notification,
        visible: false
      };
    });

    this.setNotifications(newNotifications);
  }

  showAll() {
    const notifications = this.getNotifications();
    const newNotifications = notifications.map(notification => {
      const newNotification = { ...notification };
      /**
       * For notifications to be shown with fade animation
       * they should have visible false and closed undefined
       * so they can go through the noraml flow of mounting
       * calculating size, position and fade
       */

      // delete only where is false
      if (!newNotification.visible) {
        delete newNotification.visible;
      }
      if (newNotification.closed) {
        delete newNotification.closed;
      }

      return newNotification;
    });

    this.setNotifications(newNotifications);
  }

  removeAll() {
    this.setNotifications([]);
  }

  showNotification(id) {
    const found = this.updateNotification({
      id,
      changes: { visible: null, closed: null }
    });
    this.props.onShow();

    return found;
  }

  // event handlers
  handleNotificationSizeChange(config) {
    // update notifications
    this.updateNotification(config);
  }

  handleNotificationShow(id) {
    this.updateNotification({
      id,
      changes: {
        visible: true
      }
    });

    if (this.props.onShow) {
      this.props.onShow(id);
    }
  }

  handleNotificationHide({ id }) {
    this.updateNotification({ id, changes: { visible: false } });

    if (this.props.onHide) {
      this.props.onHide(id);
    }
  }

  handleNotificationClose(id) {
    const notification = this.getNotification(id);
    const stacking = notification.stacking;

    if (this.props.removeOnHide) {
      this.removeNotification({ id, stacking });
    } else {
      /**
       * Market as closed.
       * The notification won't be rendered
       * but it's description will be kept.
       */
      this.updateNotification({ id, changes: { closed: true }, stacking });
    }

    if (this.props.onClose) {
      this.props.onClose(id);
    }
  }

  handleWindowScroll() {
    const newNotifications = this.updateAllStackPositions();
    this.setNotifications(newNotifications);
  }

  closeNotification(id) {
    const notification = this.getNotification(id);
    const stacking = notification.stacking;

    this.updateNotification({ id, changes: { closed: true }, stacking });
  }

  updateNotification({ id, changes, stacking }) {
    let found = false;
    let newNotifications = this.getNotifications().map(notification => {
      if (notification.id === id) {
        found = true;
        return {
          ...notification,
          ...changes
        };
      }
      return notification;
    });

    if (stacking) {
      newNotifications = this.updatePositionForStack({
        stacking,
        notifications: newNotifications
      });
    }

    this.setNotifications(newNotifications);

    return found;
  }

  removeNotification(config) {
    let id;
    let stacking;
    if (typeof config == 'number' || typeof config == 'string') {
      id = config;
    } else {
      id = config.id;
      stacking = config.stacking;
    }

    const allNotifications = this.getNotifications();
    let newNotifications = allNotifications.filter(
      notification => notification.id !== id
    );

    if (!stacking) {
      const notificaiton = this.getNotification(id);
      if (notificaiton) {
        stacking = notificaiton.stacking;
      }
    }

    const found = newNotifications.length !== allNotifications.length;

    if (found) {
      if (stacking) {
        newNotifications = this.updatePositionForStack({
          stacking,
          notifications: newNotifications
        });
      }

      this.setNotifications(newNotifications);
      this.props.onRemove(id);
    }

    return found;
  }

  // register/unregister to global namespace
  register() {
    if (!global.zippy) {
      global.zippy = {};
    }

    if (!global.zippy.notification) {
      global.zippy.notification = {};
    }

    global.zippy.notification[this.props.id] = this;
  }

  unregister() {
    if (
      global.zippy &&
      global.zippy.notification &&
      global.zippy.notification[this.props.id]
    ) {
      global.zippy.notification[this.props.id] = null;
    }
  }

  /**
   * Adds an id if it doesn't have one.
   * Adds default props.
   */
  normalizeNotification(notification) {
    const id = notification.id || this.getNewNotificationId();

    const defaultProps = getDefaultConfig(this.props);
    const newNotification = {
      id,
      ...defaultProps,
      ...notification
    };

    // a notification with visible false should be closed
    // so it won't transition into visible
    if (notification.visible === false) {
      newNotification.closed = true;
    }

    // style has to be merged
    if (notification.style && defaultProps.style) {
      newNotification.style = { ...defaultProps.style, ...notification.style };
    }

    return newNotification;
  }

  normalizeNotifications(notifications) {
    return notifications.map(notification =>
      this.normalizeNotification(notification)
    );
  }
}

function emptyFn() {}

NotificationBoard.defaultProps = {
  id: 'main',
  defaultNotifications: [],
  hideOnClick: false,
  nonBlocking: false,
  push: 'start',
  relativeToViewport: true,

  // Subcomponents
  closeButton: true,
  titleEllipsis: true,
  opacity: 0.85,

  // style
  borderRadius: 0,
  theme: 'default',

  // hide, show, animations, delay
  autoHideDelay: 3000,
  delayAutoHideOnMouseOver: true,
  cancelAutoHideOnClick: true,
  moveTransition: true,
  showAnimation: true,
  hideAnimation: true,
  hideTransitionDuration: 300,
  showTransitionDuration: 200,

  clearOpacityOnMouseEnter: true,

  onHide: emptyFn,
  onClose: emptyFn,
  onShow: emptyFn,
  onRemove: emptyFn,

  stacking: ['bottom', 'left'],
  region: true,
  regionOffset: 0,
  offset: { left: 5, top: 0, right: 0, bottom: 5 },
  stackingWrap: true,
  removeOnHide: true
};

NotificationBoard.propTypes = {
  id: PropTypes.string,
  defaultNotifications: PropTypes.arrayOf(PropTypes.object),
  clearOpacityOnMouseEnter: PropTypes.bool,
  nonBlocking: PropTypes.bool,
  removeOnHide: PropTypes.bool,
  rtl: PropTypes.bool,
  updatePositionOnScroll: PropTypes.bool,
  relativeToViewport: PropTypes.bool,

  // Subcomponents
  title: PropTypes.oneOfType([PropTypes.node, PropTypes.bool]),
  titleEllipsis: PropTypes.bool,
  closeButton: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
    PropTypes.bool
  ]),
  pinButton: PropTypes.oneOfType([
    PropTypes.node,
    PropTypes.func,
    PropTypes.bool
  ]),
  icon: PropTypes.node,
  content: PropTypes.node,

  theme: PropTypes.string,

  // hide, show, animations, delay
  autoHideDelay: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
  delayAutoHideOnMouseOver: PropTypes.bool,
  cancelAutoHideOnClick: PropTypes.bool,
  moveTransition: PropTypes.bool,
  showAnimation: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  hideAnimation: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  hideTransitionDuration: PropTypes.number,
  showTransitionDuration: PropTypes.number,

  // style
  style: PropTypes.object,
  border: PropTypes.string,
  borderRadius: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  background: PropTypes.string,
  padding: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.object
  ]),
  height: PropTypes.number,
  width: PropTypes.number,
  minSize: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.shape({
      height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      width: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ]),
  maxSize: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.string,
    PropTypes.shape({
      height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      width: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    })
  ]),
  opacity: PropTypes.number,
  shadow: PropTypes.bool,

  // position
  push: PropTypes.oneOf(['start', 'end']),
  stacking: PropTypes.arrayOf(
    PropTypes.oneOf(['top', 'left', 'bottom', 'right', 'center'])
  ),
  region: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
    PropTypes.func,
    PropTypes.bool
  ]),
  regionOffset: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      top: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
      right: PropTypes.number
    })
  ]),
  offset: PropTypes.oneOfType([
    PropTypes.number,
    PropTypes.shape({
      top: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
      right: PropTypes.number
    })
  ]),
  stackingWrap: PropTypes.bool,

  // events
  onHide: PropTypes.func,
  onClose: PropTypes.func,
  onShow: PropTypes.func,
  onRemove: PropTypes.func
};

export default NotificationBoard;
