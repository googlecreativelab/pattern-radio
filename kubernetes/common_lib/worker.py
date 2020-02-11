#!/usr/bin/python
#
# Copyright 2019 Google Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import logging
import multiprocessing
import time
from google.api_core.exceptions import DeadlineExceeded
from google.cloud import pubsub_v1

CLOUD_PROJECT = 'gweb-deepblue'
ACK_DEADLINE = 30

def _log(message):
    ret = {}
    if message.attributes:
        for key in message.attributes:
            k = 'pubsub_'+key
            ret[k] = message.attributes.get(key)
    return ret

def _get_attributes(message):
    ret = {}
    if message.attributes:
        for key in message.attributes:
            k = key
            ret[k] = message.attributes.get(key)
    return ret
    
def pull_pubsub_streaming(pubsub_subscription, callback, setup=None):
    subscriber = pubsub_v1.SubscriberClient()
    subscription_path = subscriber.subscription_path(
        CLOUD_PROJECT, pubsub_subscription)

    lock = multiprocessing.Lock()

    def _callback(message):
        logging.info(
            "Received job" ,
            extra=_log(message),
        )            
        try:
            attributes = _get_attributes(message)
            with lock:
                callback(attributes)
            
            logging.info(
                "Finished job" ,
                extra=_log(message),
            )            
        
            message.ack()
        
        except Exception as e:                
            message.nack()
            logging.exception("Error happened during processing", e)

    if setup:
        setup(None)

    flow_control = pubsub_v1.types.FlowControl(max_messages=1)
    subscriber.subscribe(subscription_path, callback=_callback, flow_control=flow_control)

    # The subscriber is non-blocking, so we must keep the main thread from
    # exiting to allow it to process messages in the background.
    logging.info('Listening for messages on {}'.format(subscription_path))
    while True:
        time.sleep(60)



def pull_pubsub(pubsub_subscription, callback, setup=None):
    """ Listen for pubsub messages """
    logging.info('Listening for messages on {}'.format(pubsub_subscription))

    processes = dict()
    while True:
        try:
            subscriber = pubsub_v1.SubscriberClient()
            subscription_path = subscriber.subscription_path(
                CLOUD_PROJECT, pubsub_subscription)

            response = subscriber.pull(
                subscription_path, max_messages=1, return_immediately=True)

            if response and len(response.received_messages) > 0:
                
                # Start processing messages on seperate thread in order to keep
                # refreshing ACK on pubsub on main thread
                for message in response.received_messages:
                    if setup:
                        setup(message.message)
                
                    logging.info(
                        "Received job" ,
                        extra=_log(message.message),
                    )
                    
                    process = multiprocessing.Process(
                        target=callback, args=(message.message,))
                    processes[process] = (message.ack_id, message.message.data)
                    process.start()
            else:
                # Sleep thread before pullin pubsub again
                time.sleep(10)

            # Keep refresing ack deadline
            while processes:
                for process in list(processes):
                    ack_id, msg_data = processes[process]
                    # If the process is still running, reset the ack deadline as
                    # specified by ACK_DEADLINE once every while as specified
                    # by SLEEP_TIME.
                    if process.is_alive():
                        logging.info("Process still running, extending ack deadline (%i processes)" % len(processes))
                        subscriber.modify_ack_deadline(
                            subscription_path,
                            [ack_id],
                            ack_deadline_seconds=ACK_DEADLINE)

                    # If the processs is finished, acknowledges using `ack_id`.
                    else:
                        logging.info("Process exited with code %s", process.exitcode)
                        if process.exitcode == 0:
                            subscriber.acknowledge(subscription_path, [ack_id])
                            logging.info("Acknowledged {}".format(msg_data))
                        else:
                            logging.error("Not acknowledged {}".format(msg_data))
                        processes.pop(process)

                # If there are still processes running, sleeps the thread.
                if processes:
                    time.sleep(3)

        except DeadlineExceeded as e:
            # logging.exception("Exception of type Deadline Exceeded. Restarting!")
            # raise e
            # logging.exception("Exception of type %s during processing" % e)
            logging.warning("Deadline Exceeded. Waiting")
            time.sleep(10)
        except Exception as e:
            logging.exception("Exception of type %s during processing" % e)
            time.sleep(1)
