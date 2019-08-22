# What is it?

Intercomm is a thin layer of abstraction for RPC (Remote Procedure Call) request and response.
It defines a standard way of encapsulating messages in order to send them. It is completely
agnostic to the manner messages are actually sent, routed and received. Those methods MUST
be defined externally. Intercomm is responsible for managing requests, responses, event publishing. It was designed to work in any environment.

# History

It was originally designed for intercommunication between browser service-worker, main process and worker processes. No network at all.