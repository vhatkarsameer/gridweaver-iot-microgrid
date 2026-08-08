package gridweaver_iot_microgrid;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GridweaverIotMicrogridApplication {

	public static void main(String[] args) {
		SpringApplication.run(GridweaverIotMicrogridApplication.class, args);
	}

}
