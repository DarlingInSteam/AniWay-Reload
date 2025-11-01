package shadowshift.studio.parserservice.web.dto;

/**
 * DTO representing chapter number selector for partial build requests.
 */
public class ChapterNumberRequest {

    private Double number;

    private Integer volume;

    public Double getNumber() {
        return number;
    }

    public void setNumber(Double number) {
        this.number = number;
    }

    public Integer getVolume() {
        return volume;
    }

    public void setVolume(Integer volume) {
        this.volume = volume;
    }
}
