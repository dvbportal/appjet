package net.appjet.ajstdlib.native;

object AllNatives {
  def all: List[Object] =
    List(
      Request,
      Response,
      SimpleHttpClient,
      MD5,
      EmailSendingService,
      CronFunctions,
      CometService,
      NewCometService,
      SimpleDnsClient,
      Execution
    );
}

